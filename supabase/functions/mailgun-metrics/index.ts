import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CAMPAIGNS = 60;
const CONCURRENCY = 5;

const METRIC_COUNT_KEYS = [
  "sent_count",
  "delivered_count",
  "opened_count",
  "clicked_count",
  "unique_clicked_count",
  "bounced_count",
  "permanent_failed_count",
  "complained_count",
  "unsubscribed_count",
] as const;

type MetricKey = (typeof METRIC_COUNT_KEYS)[number];
type MetricsPayload = Partial<Record<MetricKey, number | null>>;

function toMailgunRfc2822Utc(d: Date): string {
  return d.toUTCString();
}

async function requireAuthedUser(req: Request): Promise<true | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    return {
      error: new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return true;
}

async function verifyCampaignAccess(req: Request, campaignIds: string[]): Promise<{ ok: true } | { error: Response }> {
  if (campaignIds.length === 0) return { ok: true };
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await userClient.from("campaigns").select("id").in("id", campaignIds);
  if (error) {
    return {
      error: new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const set = new Set((data ?? []).map((r: { id: string }) => r.id));
  for (const id of campaignIds) {
    if (!set.has(id)) {
      return {
        error: new Response(JSON.stringify({ error: "Forbidden or campaign not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }),
      };
    }
  }
  return { ok: true };
}

function mergeMetrics(items: MetricsPayload[]): MetricsPayload {
  const out: MetricsPayload = {};
  for (const k of METRIC_COUNT_KEYS) {
    let s = 0;
    for (const m of items) {
      s += Number(m[k] ?? 0);
    }
    out[k] = s;
  }
  return out;
}

function safePct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function ratesFromMetrics(m: MetricsPayload): { clickRate: number; bounceRate: number } {
  const del = Math.max(0, Number(m.delivered_count ?? 0));
  const snt = Math.max(0, Number(m.sent_count ?? 0));
  const uniqueClicks = Math.max(0, Number(m.unique_clicked_count ?? 0));
  const bounced = Math.max(0, Number(m.bounced_count ?? 0));
  return {
    clickRate: safePct(uniqueClicks, del),
    bounceRate: safePct(bounced, snt > 0 ? snt : del),
  };
}

async function fetchOneTagMetrics(
  baseUrl: string,
  domain: string,
  apiKey: string,
  tag: string,
  start: string,
  end: string,
): Promise<MetricsPayload> {
  const body = {
    start,
    end,
    resolution: "day",
    include_aggregates: true,
    metrics: [...METRIC_COUNT_KEYS],
    filter: {
      AND: [
        { attribute: "domain", comparator: "=", values: [{ label: "domain", value: domain }] },
        { attribute: "tag", comparator: "=", values: [{ label: "tag", value: tag }] },
      ],
    },
  };

  const res = await fetch(`${baseUrl}/v1/analytics/metrics`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Mailgun ${res.status}`);
  }

  const json = (await res.json()) as {
    aggregates?: { metrics?: MetricsPayload };
  };
  return json.aggregates?.metrics ?? {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAuthedUser(req);
  if (auth !== true) return auth.error;

  let body: { campaignIds?: string[]; start?: string; end?: string };
  try {
    body = (await req.json()) as { campaignIds?: string[]; start?: string; end?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const campaignIds = Array.isArray(body.campaignIds) ? body.campaignIds : [];
  const startIso = typeof body.start === "string" ? body.start : "";
  const endIso = typeof body.end === "string" ? body.end : "";

  if (campaignIds.length > MAX_CAMPAIGNS) {
    return new Response(
      JSON.stringify({ error: `At most ${MAX_CAMPAIGNS} campaigns per request` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const v = await verifyCampaignAccess(req, campaignIds);
  if ("error" in v) return v.error;

  const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
  const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Mailgun is not configured",
        metrics: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (campaignIds.length === 0 || !startIso || !endIso) {
    const z = (() => {
      const base: Record<string, number> = {};
      for (const k of METRIC_COUNT_KEYS) base[k] = 0;
      return {
        ...base,
        clickRate: 0,
        bounceRate: 0,
      };
    })();
    return new Response(
      JSON.stringify({ ok: true, metrics: z }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const startD = new Date(startIso);
  const endD = new Date(endIso);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) {
    return new Response(JSON.stringify({ error: "Invalid start or end" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startMu = toMailgunRfc2822Utc(startD);
  const endMu = toMailgunRfc2822Utc(endD);
  const mailgunBase = Deno.env.get("MAILGUN_REGION") === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const tags = campaignIds.map((id) => `campaign-${id}`);

  try {
    const partials: MetricsPayload[] = [];
    for (let i = 0; i < tags.length; i += CONCURRENCY) {
      const batch = tags.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map((tag) =>
          fetchOneTagMetrics(mailgunBase, MAILGUN_DOMAIN, MAILGUN_API_KEY, tag, startMu, endMu),
        ),
      );
      partials.push(...results);
    }
    const m = mergeMetrics(partials);
    const rates = ratesFromMetrics(m);
    const countOut: Record<string, number> = {};
    for (const k of METRIC_COUNT_KEYS) {
      countOut[k] = Math.round(Number(m[k] ?? 0));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        metrics: {
          ...countOut,
          ...rates,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ ok: false, error: message, metrics: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
