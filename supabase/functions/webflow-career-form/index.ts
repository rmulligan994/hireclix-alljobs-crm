/**
 * Webflow Career Form Webhook Handler
 *
 * Receives Webflow form submissions and creates candidates in the CRM.
 * Configure in Webflow: Site Settings → Integrations → Webhooks → Form submission
 * URL: https://xvkeruwiravjnzikrtkp.supabase.co/functions/v1/webflow-career-form
 *
 * Required hidden fields on career forms:
 *   - crm_interaction: "clarity" (or WEBFLOW_CRM_INTERACTION_VALUE). Use field name "crm_interaction" OR label
 *     "CRM Interaction" in Webflow — we match both (Webflow sends keys with spaces from labels).
 *   - pipeline_id: optional UUID
 *   - talent_pool_ids: optional comma-separated UUIDs
 *
 * Secrets: WEBFLOW_CRM_INTERACTION_VALUE, WEBFLOW_CLIENT_SECRET (optional),
 *         TURNSTILE_SECRET_KEY (optional), WEBFLOW_ALLOWED_SITE_IDS (optional),
 *         WEBFLOW_CAREER_FORM_PIPELINE_ID (fallback), WEBFLOW_CAREER_FORM_TALENT_POOL_IDS (fallback)
 *         WEBFLOW_SKIP_SIGNATURE_VERIFICATION=true (bypass signature check if 401)
 *         WEBFLOW_AUTH_TOKEN (Bearer token with forms:read + forms:write for resume fetch and optional delete)
 *         WEBFLOW_RESUME_SKIP=true (skip resume upload entirely; no error)
 *         WEBFLOW_DELETE_AFTER_IMPORT=true (delete form submission from Webflow after saving to CRM; requires forms:write)
 *
 * Webflow: Turn OFF "Restrict uploaded file access" in Site settings > Apps & Integrations
 * so file URLs are publicly accessible (required for Zapier/third-party integrations).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertFullyResolvedMergeTags,
  replaceMergeTags,
  type MergeContext,
} from "../_shared/campaign-merge-tags.ts";
import { prependTopPadding } from "../_shared/email-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE = "Career Site Form";
const BUCKET = "resumes";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // max requests per IP per minute

// In-memory rate limit (per instance; resets on cold start)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  let timestamps = rateLimitMap.get(ip) || [];
  timestamps = timestamps.filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// Webflow signature: HMAC-SHA256 of timestamp:body with client secret
async function verifyWebflowSignature(
  secret: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) return false; // 5 min replay window (ts in ms)
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const message = encoder.encode(`${timestamp}:${body}`);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, message);
  const hashArray = Array.from(new Uint8Array(sigBuffer));
  const computed = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return computed === signature;
}

async function verifyTurnstile(secret: string, response: string, remoteip?: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response,
    ...(remoteip && { remoteip }),
  });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  return data?.success === true;
}

// Case-insensitive field lookup
function getField(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  const lower = Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [k.toLowerCase().trim(), v])
  ) as Record<string, unknown>;
  for (const key of keys) {
    const val = lower[key.toLowerCase()];
    if (val != null && typeof val === "string" && val.trim()) return val.trim();
    if (val != null && typeof val === "number") return String(val).trim();
  }
  return undefined;
}

// Fallback: find value by key containing searchTerms, skip keys containing excludeTerms
function getFieldByPartialMatch(
  data: Record<string, unknown>,
  searchTerms: string[],
  excludeTerms?: string[]
): string | undefined {
  const entries = Object.entries(data || {});
  for (const [k, v] of entries) {
    if (v == null || (typeof v !== "string" && typeof v !== "number")) continue;
    const kLower = k.toLowerCase();
    if (excludeTerms?.some((t) => kLower.includes(t.toLowerCase()))) continue;
    if (searchTerms.some((t) => kLower.includes(t.toLowerCase()))) {
      const str = typeof v === "string" ? v.trim() : String(v).trim();
      if (str) return str;
    }
  }
  return undefined;
}

// Resume field: look for URL in common field names, or from schema (FormFileUpload)
function getResumeUrl(
  data: Record<string, unknown>,
  schema?: { fieldName?: string; fieldType?: string }[]
): string | undefined {
  // First try known field names
  let val = getField(data, "resume", "cv", "resume upload", "resume file");
  if (!val && schema) {
    const fileField = schema.find(
      (s) => s.fieldType === "FormFileUpload" || String(s.fieldType || "").toLowerCase().includes("file")
    );
    if (fileField?.fieldName) {
      val = getField(data, fileField.fieldName) ?? (data[fileField.fieldName] as string | undefined);
    }
  }
  // Fallback: any value that looks like a file URL
  if (!val && data) {
    for (const v of Object.values(data)) {
      if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))) return v.trim();
    }
  }
  if (!val || typeof val !== "string") return undefined;
  const str = val.trim();
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  return undefined;
}

// Hidden fields
function getPipelineId(data: Record<string, unknown>): string | undefined {
  return getField(
    data,
    "pipeline_id",
    "pipelineid",
    "target_pipeline",
    "pipeline id",
    "pipeline-id",
  );
}

function getTalentPoolIds(data: Record<string, unknown>): string[] {
  const val = getField(
    data,
    "talent_pool_ids",
    "talentpoolids",
    "talent_pools",
    "talent pool ids",
    "talent pools",
  );
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function getCrmInteraction(data: Record<string, unknown>): string | undefined {
  return getField(
    data,
    "crm_interaction",
    "crminteraction",
    "crm interaction",
    "crm-interaction",
  );
}

/** Webflow usually sends { triggerType, payload: { data, siteId, ... } }; some tools send { data } at root. */
function extractFormData(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.payload as Record<string, unknown> | undefined;
  if (inner?.data && typeof inner.data === "object" && inner.data !== null && !Array.isArray(inner.data)) {
    return inner.data as Record<string, unknown>;
  }
  if (o.data && typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>;
  }
  return null;
}

function mapFormDataToCandidate(data: Record<string, unknown>): {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
} {
  // Webflow uses "First Name", "Last Name" (lowercased to "first name", "last name")
  // Fallback: match by partial key (e.g. "Your First Name" -> firstName)
  const firstName =
    getField(data, "first name", "first_name", "given name", "givenname") ||
    getFieldByPartialMatch(data, ["first"], ["last", "full", "surname"]);
  const lastName =
    getField(data, "last name", "last_name", "family name", "familyname", "surname") ||
    getFieldByPartialMatch(data, ["last", "surname", "family"], ["first"]);
  const email = getField(data, "email", "email address") || getFieldByPartialMatch(data, ["email"]);
  const phone = getField(data, "phone", "phone number", "telephone", "mobile");
  const company = getField(data, "company", "organization", "employer");
  const title = getField(data, "title", "job title", "job_title", "position", "role");
  const location = getField(data, "location", "city", "address");

  // If no first/last, try splitting from single "Name" field
  let first = firstName;
  let last = lastName;
  if (!first && !last) {
    const name = getField(data, "name", "full name", "your name", "fullname");
    if (name) {
      const parts = name.trim().split(/\s+/);
      first = parts[0] || undefined;
      last = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    }
  }

  return {
    firstName: first,
    lastName: last,
    email,
    phone,
    company,
    title,
    location,
  };
}

/** Best-effort welcome email; logs errors and never throws. */
async function sendWelcomeEmailIfConfigured(
  supabase: ReturnType<typeof createClient>,
  candidateId: string,
  candidateRow: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    company: string | null;
    title: string | null;
    location: string | null;
    source: string | null;
    tags: string[] | null;
    linkedin_url: string | null;
  },
): Promise<void> {
  try {
    if (!candidateRow.email?.trim()) return;

    const { data: orgRow } = await supabase
      .from("organization_settings")
      .select(
        "company_name, brand_name, base_url, welcome_email_enabled, welcome_email_template_id",
      )
      .limit(1)
      .maybeSingle();

    if (!orgRow?.welcome_email_enabled || !orgRow.welcome_email_template_id) return;

    const { data: cand } = await supabase
      .from("candidates")
      .select("marketing_email_unsubscribed")
      .eq("id", candidateId)
      .maybeSingle();
    if (cand?.marketing_email_unsubscribed) return;

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("id", orgRow.welcome_email_template_id)
      .maybeSingle();

    if (!template?.html_content?.trim()) {
      console.warn("Welcome email: template has no html_content");
      return;
    }

    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    const MAILGUN_FROM = Deno.env.get("MAILGUN_FROM") || `Beacon CRM <noreply@${MAILGUN_DOMAIN}>`;
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.warn("Welcome email: Mailgun not configured");
      return;
    }

    const { data: sender } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, company, title, linkedin_url")
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const senderData = sender || {
      first_name: "",
      last_name: "",
      email: "",
      company: "",
      title: "",
      linkedin_url: "",
    };

    const baseUrl = orgRow.base_url || Deno.env.get("APP_URL") || "";
    const mergeContext: MergeContext = {
      candidate: candidateRow,
      campaign: { name: "Talent community" },
      sender: senderData,
      org: {
        company_name: orgRow.company_name,
        brand_name: orgRow.brand_name,
        base_url: orgRow.base_url,
      },
      job: null,
      recipientId: candidateId,
      baseUrl,
      unsubscribeRecipientParam: "c",
    };

    const personalizedSubject = replaceMergeTags(template.subject ?? "Welcome", mergeContext);
    let personalizedHtml = replaceMergeTags(template.html_content, mergeContext);
    const mergeResolved = assertFullyResolvedMergeTags(personalizedSubject, personalizedHtml);
    if (!mergeResolved.ok) {
      console.error("Welcome email: unresolved merge tags:", mergeResolved.keys);
      return;
    }
    personalizedHtml = prependTopPadding(personalizedHtml, 24);

    const mailgunBaseUrl = Deno.env.get("MAILGUN_REGION") === "EU"
      ? "https://api.eu.mailgun.net"
      : "https://api.mailgun.net";
    const mailgunUrl = `${mailgunBaseUrl}/v3/${MAILGUN_DOMAIN}/messages`;

    const formData = new FormData();
    formData.append("from", MAILGUN_FROM);
    formData.append("to", candidateRow.email);
    formData.append("subject", personalizedSubject);
    formData.append("html", personalizedHtml);
    formData.append("o:tracking", "yes");
    formData.append("o:tag", "welcome-email");
    formData.append("v:candidate_id", candidateId);

    const response = await fetch(mailgunUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
      body: formData,
    });

    if (!response.ok) {
      let errText = await response.text();
      try {
        const j = JSON.parse(errText) as { message?: string };
        if (j.message) errText = j.message;
      } catch {
        /* keep raw */
      }
      console.error("Welcome email Mailgun error:", errText);
      return;
    }

    let result: { id?: string };
    try {
      result = await response.json();
    } catch {
      console.error("Welcome email: invalid JSON from Mailgun");
      return;
    }
    const messageId = result.id;
    if (!messageId) {
      console.error("Welcome email: Mailgun did not return message id");
      return;
    }

    await supabase.from("communications").insert({
      candidate_id: candidateId,
      type: "email",
      subject: personalizedSubject,
      content: personalizedHtml.replace(/<[^>]*>/g, "").slice(0, 500),
      direction: "outbound",
      occurred_at: new Date().toISOString(),
      campaign_recipient_id: null,
      external_message_id: messageId,
      created_by: null,
    });
  } catch (e) {
    console.error("Welcome email:", (e as Error).message);
  }
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = extractFormData(payload);
  const webflowPayload = payload?.payload as
    | { name?: string; siteId?: string; id?: string; data?: Record<string, unknown>; schema?: unknown }
    | undefined;

  if (!data || typeof data !== "object") {
    return new Response(
      JSON.stringify({
        error: "Missing form data",
        hint: "Expected Webflow form_submission JSON with payload.data (or root data).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 1. crm_interaction filter — without a matching value we intentionally no-op (avoid importing random forms)
  const expectedCrm = Deno.env.get("WEBFLOW_CRM_INTERACTION_VALUE") || "clarity";
  const crmVal = getCrmInteraction(data);
  if (!crmVal || crmVal.toLowerCase() !== expectedCrm.toLowerCase()) {
    return new Response(
      JSON.stringify({
        ignored: true,
        reason: "crm_interaction",
        detail: crmVal
          ? `Value "${crmVal}" does not match WEBFLOW_CRM_INTERACTION_VALUE (default: clarity).`
          : "No crm_interaction field found. Add a hidden field named crm_interaction or labeled CRM Interaction with value clarity.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 2. Webflow signature (optional)
  const skipSignature = Deno.env.get("WEBFLOW_SKIP_SIGNATURE_VERIFICATION") === "true";
  const webflowSecret = Deno.env.get("WEBFLOW_CLIENT_SECRET")?.trim();
  const timestamp = req.headers.get("x-webflow-timestamp");
  const signature = req.headers.get("x-webflow-signature");
  if (!skipSignature && webflowSecret && timestamp && signature) {
    const valid = await verifyWebflowSignature(webflowSecret, timestamp, rawBody, signature);
    if (!valid) {
      console.error("Webflow signature verification failed. Set WEBFLOW_SKIP_SIGNATURE_VERIFICATION=true to bypass.");
      return new Response(
        JSON.stringify({
          error: "Invalid signature",
          hint: "Set WEBFLOW_SKIP_SIGNATURE_VERIFICATION=true to bypass, or verify WEBFLOW_CLIENT_SECRET matches Webflow's key.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // 3. Site ID allowlist (optional)
  const allowedSites = Deno.env.get("WEBFLOW_ALLOWED_SITE_IDS");
  if (allowedSites && webflowPayload?.siteId) {
    const ids = allowedSites.split(",").map((s) => s.trim().toLowerCase());
    if (!ids.includes(String(webflowPayload.siteId).toLowerCase())) {
      return new Response(JSON.stringify({ error: "Site not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 4. Turnstile (optional)
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const turnstileToken = getField(data, "cf-turnstile-response", "cf_turnstile_response");
  const skipTurnstile = Deno.env.get("TURNSTILE_SKIP_VERIFICATION") === "true";
  if (!skipTurnstile && turnstileSecret && turnstileToken) {
    const valid = await verifyTurnstile(turnstileSecret, turnstileToken, ip);
    if (!valid) {
      console.error("Turnstile verification failed. Set TURNSTILE_SKIP_VERIFICATION=true to bypass.");
      return new Response(
        JSON.stringify({ error: "Bot verification failed", hint: "Set TURNSTILE_SKIP_VERIFICATION=true to bypass." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const candidateData = mapFormDataToCandidate(data);
  if (!candidateData.email && !candidateData.phone) {
    return new Response(JSON.stringify({ error: "Email or phone required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Duplicate check by email
  let existingCandidateId: string | null = null;
  if (candidateData.email) {
    const { data: existing } = await supabase
      .from("candidates")
      .select("id")
      .ilike("email", candidateData.email)
      .limit(1)
      .maybeSingle();
    existingCandidateId = existing?.id || null;
  }

  const pipelineId = getPipelineId(data) || Deno.env.get("WEBFLOW_CAREER_FORM_PIPELINE_ID");
  const talentPoolIds = getTalentPoolIds(data).length > 0
    ? getTalentPoolIds(data)
    : (Deno.env.get("WEBFLOW_CAREER_FORM_TALENT_POOL_IDS") || "").split(",").map((s) => s.trim()).filter(Boolean);

  let candidateId: string;

  if (existingCandidateId) {
    candidateId = existingCandidateId;
    // Add to pool/pipeline if configured
    if (pipelineId) {
      const pipeline = await supabase.from("pipelines").select("id, stages").eq("id", pipelineId).maybeSingle();
      if (pipeline.data) {
        const stages = pipeline.data.stages as { id?: string; name?: string }[] | null;
        const firstStage = stages?.[0];
        const stage = firstStage?.id ?? firstStage?.name ?? "1";
        await supabase.from("pipeline_candidates").upsert(
          { pipeline_id: pipelineId, candidate_id: candidateId, stage },
          { onConflict: "pipeline_id,candidate_id", ignoreDuplicates: true }
        );
      }
    }
    for (const poolId of talentPoolIds) {
      if (poolId) {
        await supabase.from("talent_pool_candidates").upsert(
          { talent_pool_id: poolId, candidate_id: candidateId },
          { onConflict: "talent_pool_id,candidate_id", ignoreDuplicates: true }
        );
      }
    }
    return new Response(JSON.stringify({ success: true, duplicate: true, candidateId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create new candidate
  const { data: inserted, error: insertError } = await supabase
    .from("candidates")
    .insert({
      first_name: candidateData.firstName || null,
      last_name: candidateData.lastName || null,
      email: candidateData.email || null,
      phone: candidateData.phone || null,
      company: candidateData.company || null,
      title: candidateData.title || null,
      location: candidateData.location || null,
      source: SOURCE,
      tags: [],
      created_by: null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Candidate insert error:", insertError);
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  candidateId = inserted.id;

  // Add to pipeline
  if (pipelineId) {
    const pipeline = await supabase.from("pipelines").select("id, stages").eq("id", pipelineId).maybeSingle();
    if (pipeline.data) {
      const stages = pipeline.data.stages as { id?: string; name?: string }[] | null;
      const firstStage = stages?.[0];
      const stage = firstStage?.id ?? firstStage?.name ?? "1";
      await supabase.from("pipeline_candidates").insert({
        pipeline_id: pipelineId,
        candidate_id: candidateId,
        stage,
      });
    }
  }

  // Add to talent pools
  for (const poolId of talentPoolIds) {
    if (poolId) {
      await supabase.from("talent_pool_candidates").upsert(
        { talent_pool_id: poolId, candidate_id: candidateId },
        { onConflict: "talent_pool_id,candidate_id", ignoreDuplicates: true }
      );
    }
  }

  if (candidateData.email) {
    await sendWelcomeEmailIfConfigured(supabase, candidateId, {
      first_name: candidateData.firstName || null,
      last_name: candidateData.lastName || null,
      email: candidateData.email || null,
      company: candidateData.company || null,
      title: candidateData.title || null,
      location: candidateData.location || null,
      source: SOURCE,
      tags: [],
      linkedin_url: null,
    });
  }

  // Resume upload (use WEBFLOW_AUTH_TOKEN with forms:read scope - fetches file with Bearer auth)
  const skipResume = Deno.env.get("WEBFLOW_RESUME_SKIP") === "true";
  const schema = webflowPayload?.schema as { fieldName?: string; fieldType?: string }[] | undefined;
  let resumeUrl = getResumeUrl(data, schema);
  const webflowToken = Deno.env.get("WEBFLOW_AUTH_TOKEN")?.trim();
  const siteId = webflowPayload?.siteId as string | undefined;
  const submissionId = webflowPayload?.id as string | undefined;

  // If no URL in payload but we have token + siteId + submissionId, fetch via Forms API
  if (!resumeUrl && webflowToken && siteId && submissionId) {
    try {
      const apiRes = await fetch(
        `https://api.webflow.com/v2/sites/${siteId}/form_submissions/${submissionId}`,
        { headers: { "Authorization": `Bearer ${webflowToken}` } }
      );
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const formResponse = apiData?.formResponse as Record<string, unknown> | undefined;
        resumeUrl = formResponse ? getResumeUrl(formResponse, schema) : undefined;
      }
    } catch (e) {
      console.error("Webflow Forms API fetch:", (e as Error).message);
    }
  }

  if (!skipResume && resumeUrl && candidateId) {
    try {
      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (compatible; ClarityCRM/1.0)",
        "Accept": "*/*",
        "Referer": "https://webflow.com/",
      };
      if (webflowToken) {
        fetchHeaders["Authorization"] = `Bearer ${webflowToken}`;
      }
      let res = await fetch(resumeUrl, { headers: fetchHeaders });
      // If 401 with token, try URL with access_token query (some CDNs use this)
      if (!res.ok && res.status === 401 && webflowToken) {
        const urlWithToken = resumeUrl + (resumeUrl.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(webflowToken);
        res = await fetch(urlWithToken, { headers: fetchHeaders });
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();
      const size = blob.size;
      if (size > MAX_FILE_SIZE) throw new Error("File too large");
      const contentType = res.headers.get("content-type") || "application/pdf";
      const ext = contentType.includes("pdf") ? "pdf" : contentType.includes("word") ? "docx" : "pdf";
      const filePath = `${candidateId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, blob, { contentType, upsert: false });
      if (uploadError) throw uploadError;
      const fileName = resumeUrl.split("/").pop() || `resume.${ext}`;
      const { data: existingResume } = await supabase
        .from("candidate_resumes")
        .select("version")
        .eq("candidate_id", candidateId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = (existingResume?.version ?? 0) + 1;
      await supabase.from("candidate_resumes").update({ is_primary: false }).eq("candidate_id", candidateId);
      await supabase.from("candidate_resumes").insert({
        candidate_id: candidateId,
        file_path: filePath,
        file_name: fileName,
        file_size: size,
        mime_type: contentType,
        version: nextVersion,
        is_primary: true,
        uploaded_by: null,
      });
    } catch (err) {
      // Webflow file URLs may require login - store URL in a note so recruiter can find it
      await supabase.from("notes").insert({
        candidate_id: candidateId,
        content: `[Career form] Resume submitted via Webflow. Download from Site Settings → Forms → Form Submissions. URL: ${resumeUrl}`,
        created_by: null,
      });
      console.error("Resume upload error (URL saved in note):", (err as Error).message);
    }
  }

  // Delete form submission from Webflow after saving to CRM (privacy; requires forms:write)
  const deleteAfterImport = Deno.env.get("WEBFLOW_DELETE_AFTER_IMPORT") === "true";
  if (deleteAfterImport && webflowToken && siteId && submissionId) {
    try {
      const delRes = await fetch(
        `https://api.webflow.com/v2/sites/${siteId}/form_submissions/${submissionId}`,
        { method: "DELETE", headers: { "Authorization": `Bearer ${webflowToken}` } }
      );
      if (delRes.ok || delRes.status === 204) {
        console.log("Deleted Webflow form submission:", submissionId);
      } else {
        console.warn("Webflow delete submission failed:", delRes.status, await delRes.text());
      }
    } catch (e) {
      console.error("Webflow delete submission error:", (e as Error).message);
    }
  }

  return new Response(JSON.stringify({ success: true, candidateId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
