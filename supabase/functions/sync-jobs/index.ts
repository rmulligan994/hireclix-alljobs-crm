/**
 * Jobs sync Edge Function - fetches from Webflow CMS, upserts to Supabase.
 * Runs with longer timeout than Next.js API (avoids 504 from Cloudflare).
 * Invoked by: pg_cron, or Next.js /api/jobs/sync (manual trigger).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBFLOW_CDN_BASE = "https://api-cdn.webflow.com/v2";
const WEBFLOW_MAX_LIMIT = 100;

const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  title: "name",
  department: "department",
  location: "location",
  type: "job-type",
  description: "description",
  url: "url",
  postedDate: "posted-date",
  reqId: "name",
  slug: "slug",
};

function getFieldValue(
  fieldData: Record<string, unknown>,
  webflowField: string | string[] | undefined
): string | null {
  if (!webflowField) return null;
  if (Array.isArray(webflowField)) {
    const parts = webflowField
      .map((f) => {
        const val = fieldData[f];
        if (val == null) return null;
        if (typeof val === "object" && val !== null && "url" in val) {
          return (val as { url?: string }).url ?? null;
        }
        return String(val).trim();
      })
      .filter((v): v is string => v != null && v !== "");
    return parts.length ? parts.join(", ") : null;
  }
  const val = fieldData[webflowField];
  if (val == null) return null;
  if (typeof val === "object" && val !== null && "url" in val) {
    return (val as { url?: string }).url ?? null;
  }
  return String(val);
}

function mapItemToJob(
  item: { id: string; fieldData?: Record<string, unknown>; lastUpdated?: string },
  mapping: Record<string, string | string[]> | null,
  baseUrl: string
) {
  const fieldData = item.fieldData ?? {};
  const m = { ...DEFAULT_FIELD_MAPPING, ...(mapping ?? {}) };
  const get = (f: string) => getFieldValue(fieldData, m[f]);

  const title = get("title") ?? (fieldData.name as string) ?? "Untitled";
  const slug = get("slug") ?? (fieldData.slug as string) ?? null;

  return {
    webflow_item_id: item.id,
    title,
    department: get("department"),
    location: get("location"),
    type: get("type"),
    description: get("description"),
    url: get("url"),
    slug,
    req_id: get("reqId"),
    view_url: baseUrl && slug ? `${baseUrl}/${slug}` : null,
    posted_date: get("postedDate") ? new Date(get("postedDate")!).toISOString() : null,
    last_updated: item.lastUpdated ? new Date(item.lastUpdated).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

async function fetchWebflowAll(
  collectionId: string,
  apiToken: string
): Promise<{ id: string; fieldData?: Record<string, unknown>; lastUpdated?: string }[]> {
  const all: { id: string; fieldData?: Record<string, unknown>; lastUpdated?: string }[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams();
    params.set("limit", String(WEBFLOW_MAX_LIMIT));
    params.set("offset", String(offset));
    params.set("sortBy", "lastPublished");
    params.set("sortOrder", "desc");

    const res = await fetch(
      `${WEBFLOW_CDN_BASE}/collections/${collectionId}/items/live?${params}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Career site API ${res.status}: ${body || res.statusText}`);
    }

    const data = (await res.json()) as {
      items: { id: string; fieldData?: Record<string, unknown>; lastUpdated?: string }[];
      pagination: { total: number };
    };

    all.push(...data.items);
    if (all.length >= data.pagination.total || data.items.length < WEBFLOW_MAX_LIMIT) break;
    offset += WEBFLOW_MAX_LIMIT;
  }

  return all;
}

/** UUID that never appears as a real PK — used to delete all rows via neq filter */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Removes jobs that are no longer in the current Webflow collection (e.g. after switching
 * collection ID or deleting items in CMS). Upsert alone leaves stale rows.
 */
async function removeStaleJobs(
  supabase: ReturnType<typeof createClient>,
  syncedWebflowIds: string[]
): Promise<number> {
  if (syncedWebflowIds.length === 0) {
    const { data, error } = await supabase.from("jobs").delete().neq("id", NIL_UUID).select("id");
    if (error) throw error;
    return data?.length ?? 0;
  }

  const synced = new Set(syncedWebflowIds);
  const orphans: string[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data: rows, error } = await supabase
      .from("jobs")
      .select("webflow_item_id")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!rows?.length) break;
    for (const r of rows) {
      if (!synced.has(r.webflow_item_id)) orphans.push(r.webflow_item_id);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  let deleted = 0;
  const CHUNK = 500;
  for (let i = 0; i < orphans.length; i += CHUNK) {
    const chunk = orphans.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("jobs").delete().in("webflow_item_id", chunk).select("id");
    if (error) throw error;
    deleted += data?.length ?? 0;
  }
  return deleted;
}

Deno.serve(async (req) => {
  // Verify caller: pg_cron (anon key), cron-job.org (JOBS_CRON_SECRET), or Next.js API (service role)
  const auth = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const cronSecret = Deno.env.get("JOBS_CRON_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isAnon = anonKey && auth === anonKey;
  const isCronSecret = cronSecret && auth === cronSecret;
  const isServiceRole = serviceKey && auth === serviceKey;
  if (!isAnon && !isCronSecret && !isServiceRole) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let logId: string | null = null;

  try {
    const { data: logRow } = await supabase
      .from("jobs_sync_logs")
      .insert({ status: "running" })
      .select("id")
      .single();
    logId = logRow?.id ?? null;

    const { data: org, error: settingsError } = await supabase
      .from("organization_settings")
      .select("webflow_collection_id, webflow_api_token, webflow_job_field_mapping, career_site_base_url")
      .limit(1)
      .single();

    if (settingsError || !org) {
      await updateLog(supabase, logId, "failed", 0, 0, "Organization settings not found");
      return new Response(
        JSON.stringify({ error: "Organization settings not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const collectionId = org.webflow_collection_id;
    const apiToken = org.webflow_api_token;

    if (!collectionId || !apiToken) {
      await updateLog(supabase, logId, "failed", 0, 0, "Career site not configured");
      return new Response(
        JSON.stringify({ error: "Career site not configured", skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const items = await fetchWebflowAll(collectionId, apiToken);
    const mapping = org.webflow_job_field_mapping as Record<string, string | string[]> | null;
    let baseUrl = (org.career_site_base_url ?? "").trim().replace(/\/+$/, "");
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;

    const jobs = items.map((item) => mapItemToJob(item, mapping, baseUrl));

    let upserted = 0;
    const BATCH = 100;
    for (let i = 0; i < jobs.length; i += BATCH) {
      const batch = jobs.slice(i, i + BATCH);
      const { error } = await supabase.from("jobs").upsert(batch, {
        onConflict: "webflow_item_id",
        ignoreDuplicates: false,
      });
      if (error) throw error;
      upserted += batch.length;
    }

    const syncedIds = items.map((i) => i.id);
    const staleRemoved = await removeStaleJobs(supabase, syncedIds);

    await updateLog(supabase, logId, "success", items.length, upserted);

    return new Response(
      JSON.stringify({
        success: true,
        jobsFetched: items.length,
        jobsUpserted: upserted,
        staleJobsRemoved: staleRemoved,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = err instanceof Error ? err.stack : undefined;
    console.error("Jobs sync failed:", err);
    try {
      await updateLog(supabase, logId, "failed", 0, 0, msg, detail);
    } catch {
      /* ignore */
    }
    return new Response(
      JSON.stringify({ error: "Sync failed", detail: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function updateLog(
  supabase: ReturnType<typeof createClient>,
  logId: string | null,
  status: "success" | "failed",
  jobsFetched: number,
  jobsUpserted: number,
  errorMessage?: string,
  errorDetail?: string
) {
  if (!logId) return;
  await supabase
    .from("jobs_sync_logs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      jobs_fetched: jobsFetched,
      jobs_upserted: jobsUpserted,
      error_message: errorMessage ?? null,
      error_detail: errorDetail ?? null,
    })
    .eq("id", logId);
}
