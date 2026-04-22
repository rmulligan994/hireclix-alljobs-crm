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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendEmailRequest {
  campaignId?: string;
  recipientId?: string;
  scheduledEmailId?: string; // When provided (from cron), send that specific scheduled email
  scheduledAt?: string; // DEPRECATED: use scheduled_emails table instead. Kept for backward compat.
  /** When true, allow immediate send to pending recipients even if campaign is scheduled for the future (explicit "Send now"). */
  forceImmediateSend?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SendEmailRequest = await req.json();

    if (body.scheduledEmailId) {
      return await processScheduledEmail(supabase, body.scheduledEmailId, corsHeaders);
    }

    if (body.campaignId) {
      return await processCampaignSend(
        supabase,
        body.campaignId,
        body.recipientId,
        body.scheduledAt,
        body.forceImmediateSend,
        corsHeaders
      );
    }

    return new Response(
      JSON.stringify({ error: "campaignId or scheduledEmailId required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-campaign-email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/** Process a single scheduled email (called by cron via process-scheduled-emails) */
async function processScheduledEmail(supabase: any, scheduledEmailId: string, corsHeaders: Record<string, string>) {
  const { data: scheduled, error: scheduledError } = await supabase
    .from("scheduled_emails")
    .select("*")
    .eq("id", scheduledEmailId)
    .eq("status", "pending")
    .single();

  if (scheduledError || !scheduled) {
    console.error("Scheduled email not found or not pending:", scheduledError);
    return new Response(
      JSON.stringify({ error: "Scheduled email not found or already processed" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Skip if campaign is paused (drip sends stop until resumed)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", scheduled.campaign_id)
    .single();
  if (campaign?.status === "paused") {
    return new Response(
      JSON.stringify({ success: true, skipped: "campaign_paused" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Skip if recipient has unsubscribed or bounced since scheduling
  const { data: recipient } = await supabase
    .from("campaign_recipients")
    .select("status")
    .eq("id", scheduled.campaign_recipient_id)
    .single();
  if (recipient?.status && ["unsubscribed", "bounced", "complained"].includes(recipient.status)) {
    await supabase
      .from("scheduled_emails")
      .update({ status: "cancelled" })
      .eq("id", scheduledEmailId);
    return new Response(
      JSON.stringify({ success: true, skipped: recipient.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await sendOneEmail(supabase, {
    campaignId: scheduled.campaign_id,
    campaignEmailId: scheduled.campaign_email_id,
    campaignRecipientId: scheduled.campaign_recipient_id,
  });

  if (result.error) {
    await supabase
      .from("scheduled_emails")
      .update({ status: "failed", error_message: result.error })
      .eq("id", scheduledEmailId);
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabase
    .from("scheduled_emails")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", scheduledEmailId);

  // Insert next drip step if exists
  await insertNextDripStep(supabase, scheduled.campaign_id, scheduled.campaign_recipient_id, scheduled.campaign_email_id);

  return new Response(
    JSON.stringify({ success: true, sent: 1 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/** Send step 1 to all pending recipients, OR schedule for later by inserting into scheduled_emails. */
async function processCampaignSend(
  supabase: any,
  campaignId: string,
  recipientId?: string,
  scheduledAt?: string,
  forceImmediateSend?: boolean,
  corsHeaders: Record<string, string>
) {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return new Response(
      JSON.stringify({ error: "Campaign not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (
    !scheduledAt &&
    !forceImmediateSend &&
    campaign.status === "scheduled" &&
    campaign.scheduled_at
  ) {
    const t = new Date(campaign.scheduled_at as string).getTime();
    if (t > Date.now()) {
      return new Response(
        JSON.stringify({
          error:
            "This campaign is scheduled for a future time. Pass scheduledAt to queue rows, or pass forceImmediateSend: true to send the first email to pending recipients now.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const { data: campaignEmails, error: emailsError } = await supabase
    .from("campaign_emails")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("step_order", { ascending: true });

  if (emailsError || !campaignEmails?.length) {
    return new Response(
      JSON.stringify({ error: "No campaign emails configured" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // When rescheduling, include "scheduled" recipients (they were already queued for a previous schedule)
  const recipientStatuses = scheduledAt ? ["pending", "scheduled"] : ["pending"];
  let recipientsQuery = supabase
    .from("campaign_recipients")
    .select(`
      id,
      candidate_id,
      status,
      candidates (
        id,
        first_name,
        last_name,
        email,
        company,
        title,
        location,
        source,
        tags,
        linkedin_url,
        marketing_email_unsubscribed
      )
    `)
    .eq("campaign_id", campaignId)
    .in("status", recipientStatuses);

  if (recipientId) recipientsQuery = recipientsQuery.eq("id", recipientId);

  const { data: recipients, error: recipientsError } = await recipientsQuery;

  if (recipientsError || !recipients?.length) {
    return new Response(
      JSON.stringify({ message: "No pending recipients", sent: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const firstEmail = campaignEmails[0];

  // When scheduledAt is provided: insert into scheduled_emails for cron to process later (no immediate send)
  if (scheduledAt) {
    let queued = 0;
    let skippedNoEmail = 0;
    const recipientIds: string[] = [];
    for (const recipient of recipients) {
      const candidate = recipient.candidates as any;
      if (!candidate?.email) {
        skippedNoEmail++;
        await supabase.from("campaign_recipients").update({ status: "rejected" }).eq("id", recipient.id);
        continue;
      }

      const { error: insertErr } = await ensurePendingScheduledEmail(supabase, {
        campaign_id: campaignId,
        campaign_email_id: firstEmail.id,
        campaign_recipient_id: recipient.id,
        scheduled_at: scheduledAt,
      });
      if (!insertErr) {
        queued++;
        recipientIds.push(recipient.id);
      }
    }

    if (recipientIds.length > 0) {
      await supabase.from("campaign_recipients").update({ status: "scheduled" }).in("id", recipientIds);
    }
    await supabase.from("campaigns").update({ status: "scheduled", scheduled_at: scheduledAt }).eq("id", campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        sent: queued,
        total: recipients.length,
        skippedNoEmail: skippedNoEmail || undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Immediate send: send step 1 to each recipient, insert next drip step
  let sentCount = 0;
  let skippedNoEmail = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const candidate = recipient.candidates as any;
    if (!candidate?.email) {
      skippedNoEmail++;
      await supabase.from("campaign_recipients").update({ status: "rejected" }).eq("id", recipient.id);
      continue;
    }

    const result = await sendOneEmail(supabase, {
      campaignId,
      campaignEmailId: firstEmail.id,
      campaignRecipientId: recipient.id,
    });

    if (result.error) {
      errors.push(`${candidate.email}: ${result.error}`);
      await supabase.from("campaign_recipients").update({ status: "failed" }).eq("id", recipient.id);
      continue;
    }

    sentCount++;
    await insertNextDripStep(supabase, campaignId, recipient.id, firstEmail.id);
  }

  if (campaign.status === "scheduled" || campaign.status === "draft") {
    await supabase.from("campaigns").update({ status: "active" }).eq("id", campaignId);
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent: sentCount,
      total: recipients.length,
      skippedNoEmail: skippedNoEmail || undefined,
      errors: errors.length ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/** Compute next scheduled date using schedule_recurrence (daily/weekly/monthly) or delay_days/hours (custom) */
function computeNextScheduledAt(
  recurrence: { type?: string; dayOfWeek?: number; dayOfMonth?: number; time?: string } | null,
  nextStep: { delay_days?: number; delay_hours?: number }
): Date {
  const now = new Date();
  const [h, m] = (recurrence?.time || "09:00").split(":").map(Number);

  if (recurrence?.type === "daily") {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(h, m, 0, 0);
    return next;
  }
  if (recurrence?.type === "weekly" && recurrence.dayOfWeek != null) {
    const next = new Date(now);
    const currentDay = next.getDay();
    let daysToAdd = (recurrence.dayOfWeek - currentDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // Same day = next week
    next.setDate(next.getDate() + daysToAdd);
    next.setHours(h, m, 0, 0);
    return next;
  }
  if (recurrence?.type === "monthly" && recurrence.dayOfMonth != null) {
    const dom = recurrence.dayOfMonth;
    let next = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(dom, lastDay));
    next.setHours(h, m, 0, 0);
    if (next <= now) {
      next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextLastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(dom, nextLastDay));
      next.setHours(h, m, 0, 0);
    }
    return next;
  }

  // Custom or no recurrence: use delay_days/delay_hours
  const delayMs =
    (nextStep.delay_days || 0) * 24 * 60 * 60 * 1000 + (nextStep.delay_hours || 0) * 60 * 60 * 1000;
  return new Date(Date.now() + delayMs);
}

/** One pending row per (campaign, recipient, email step); update time if already queued (schedule-for-later retries). */
async function ensurePendingScheduledEmail(
  supabase: any,
  row: {
    campaign_id: string;
    campaign_email_id: string;
    campaign_recipient_id: string;
    scheduled_at: string;
  }
) {
  const { data: existing } = await supabase
    .from("scheduled_emails")
    .select("id")
    .eq("campaign_id", row.campaign_id)
    .eq("campaign_email_id", row.campaign_email_id)
    .eq("campaign_recipient_id", row.campaign_recipient_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return supabase.from("scheduled_emails").update({ scheduled_at: row.scheduled_at }).eq("id", existing.id);
  }

  return supabase.from("scheduled_emails").insert({ ...row, status: "pending" });
}

/** Insert the next drip step into scheduled_emails for a recipient who just received a step */
async function insertNextDripStep(
  supabase: any,
  campaignId: string,
  campaignRecipientId: string,
  currentCampaignEmailId: string
) {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("schedule_recurrence")
    .eq("id", campaignId)
    .single();

  const recurrence = campaign?.schedule_recurrence as {
    type?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    endOnDate?: string;
  } | null;

  const { data: currentStep } = await supabase
    .from("campaign_emails")
    .select("step_order, delay_days, delay_hours")
    .eq("id", currentCampaignEmailId)
    .single();

  if (!currentStep) return;

  const { data: allSteps } = await supabase
    .from("campaign_emails")
    .select("id, step_order, delay_days, delay_hours")
    .eq("campaign_id", campaignId)
    .order("step_order", { ascending: true });

  const nextStep = allSteps?.find((s: any) => s.step_order === currentStep.step_order + 1);

  let targetEmailId: string;
  let delaySource: { delay_days?: number; delay_hours?: number };

  if (nextStep) {
    targetEmailId = nextStep.id;
    delaySource = nextStep;
  } else if (recurrence?.type === "daily" || recurrence?.type === "weekly" || recurrence?.type === "monthly") {
    // Daily/weekly/monthly builder uses a single campaign_email; re-queue same step on cadence.
    targetEmailId = currentCampaignEmailId;
    delaySource = currentStep;
  } else {
    return;
  }

  const scheduledAt = computeNextScheduledAt(recurrence, delaySource);

  if (recurrence?.endOnDate) {
    const endDate = new Date(recurrence.endOnDate);
    endDate.setHours(23, 59, 59, 999);
    if (scheduledAt > endDate) return;
  }

  const { error } = await supabase.from("scheduled_emails").insert({
    campaign_id: campaignId,
    campaign_email_id: targetEmailId,
    campaign_recipient_id: campaignRecipientId,
    scheduled_at: scheduledAt.toISOString(),
    status: "pending",
  });

  if (error?.code === "23505") {
    return;
  }
  if (error) {
    console.error("insertNextDripStep insert failed:", error);
  }
}

/** Send one email to one recipient. Returns { error?: string } on failure. */
async function sendOneEmail(
  supabase: any,
  params: { campaignId: string; campaignEmailId: string; campaignRecipientId: string }
): Promise<{ error?: string }> {
  const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
  const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
  const MAILGUN_FROM = Deno.env.get("MAILGUN_FROM") || `Beacon CRM <noreply@${MAILGUN_DOMAIN}>`;

  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    return { error: "Email service not configured" };
  }

  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", params.campaignId).single();
  const { data: campaignEmail } = await supabase
    .from("campaign_emails")
    .select("*")
    .eq("id", params.campaignEmailId)
    .single();
  const { data: recipient } = await supabase
    .from("campaign_recipients")
    .select(`
      id,
      candidate_id,
      status,
      candidates (
        id,
        first_name,
        last_name,
        email,
        company,
        title,
        location,
        source,
        tags,
        linkedin_url,
        marketing_email_unsubscribed
      )
    `)
    .eq("id", params.campaignRecipientId)
    .single();

  if (!campaign || !campaignEmail || !recipient) {
    return { error: "Campaign, email, or recipient not found" };
  }

  const candidate = recipient.candidates as any;
  if (!candidate?.email) {
    return { error: "Candidate has no email" };
  }
  if (candidate.marketing_email_unsubscribed) {
    return { error: "Candidate has unsubscribed from marketing emails" };
  }
  if (["unsubscribed", "bounced", "complained"].includes(recipient.status || "")) {
    return { error: `Recipient status: ${recipient.status}` };
  }

  const { data: sender } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, company, title, linkedin_url")
    .eq("user_id", campaign.user_id)
    .single();
  const senderData = sender || { first_name: "", last_name: "", email: "", company: "", title: "", linkedin_url: "" };

  const { data: orgRows } = await supabase.from("organization_settings").select("company_name, brand_name, base_url").limit(1);
  const org = orgRows?.[0] || { company_name: "", brand_name: "", base_url: "" };

  let jobData: any = null;
  if (campaign.job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("title, department, location, type, description, url, view_url")
      .eq("id", campaign.job_id)
      .single();
    jobData = job || null;
  }

  const baseUrl = org.base_url || Deno.env.get("APP_URL") || "";
  const mergeContext: MergeContext = {
    candidate,
    campaign,
    sender: senderData,
    org,
    job: jobData,
    recipientId: recipient.id,
    baseUrl,
  };

  const personalizedSubject = replaceMergeTags(campaignEmail.subject ?? "", mergeContext);
  let rawHtml = campaignEmail.html_content || `<p>Hello ${candidate.first_name || "there"},</p><p>This is a campaign email.</p>`;
  rawHtml = fixBrokenButtonLinks(rawHtml, !!jobData);
  rawHtml = stripDuplicateUnsubscribeBeforeComplianceFooter(rawHtml);
  let personalizedHtml = replaceMergeTags(rawHtml, mergeContext);
  personalizedHtml = stripDuplicateUnsubscribeBeforeComplianceFooter(personalizedHtml);

  const mergeResolved = assertFullyResolvedMergeTags(personalizedSubject, personalizedHtml);
  if (!mergeResolved.ok) {
    return {
      error: `Unknown or unsupported merge tags: ${mergeResolved.keys.map((k) => "{{" + k + "}}").join(", ")}`,
    };
  }

  personalizedHtml = prependTopPadding(personalizedHtml, 24);

  const mailgunBaseUrl = Deno.env.get("MAILGUN_REGION") === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const mailgunUrl = `${mailgunBaseUrl}/v3/${MAILGUN_DOMAIN}/messages`;

  const formData = new FormData();
  formData.append("from", MAILGUN_FROM);
  formData.append("to", candidate.email);
  formData.append("subject", personalizedSubject);
  formData.append("html", personalizedHtml);
  formData.append("o:tracking", "yes");
  formData.append("o:tag", `campaign-${params.campaignId}`);
  formData.append("v:recipient_id", recipient.id);
  formData.append("v:campaign_id", params.campaignId);
  formData.append("v:candidate_id", recipient.candidate_id);
  formData.append("v:has_job", jobData ? "true" : "false");

  const response = await fetch(mailgunUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
    body: formData,
  });

  await new Promise((r) => setTimeout(r, 200));

  if (!response.ok) {
    let errText = await response.text();
    try {
      const j = JSON.parse(errText) as { message?: string };
      if (j.message) errText = j.message;
    } catch {
      /* keep raw */
    }
    return { error: errText || `Mailgun error (${response.status})` };
  }

  let result: { id?: string };
  try {
    result = await response.json();
  } catch {
    return { error: "Invalid JSON from Mailgun" };
  }
  const messageId = result.id;
  if (!messageId) {
    return { error: "Mailgun did not return a message id" };
  }

  await supabase
    .from("campaign_recipients")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      message_id: messageId,
    })
    .eq("id", recipient.id);

  await supabase.from("communications").insert({
    candidate_id: recipient.candidate_id,
    type: "email",
    subject: personalizedSubject,
    content: null,
    direction: "outbound",
    occurred_at: new Date().toISOString(),
    campaign_recipient_id: recipient.id,
    external_message_id: messageId,
    created_by: campaign.user_id,
  });

  return {};
}

function fixBrokenButtonLinks(html: string, hasJob: boolean): string {
  /** Compliance footer already includes {{unsubscribeLink}}; skip body stubs to avoid duplicate links. */
  const hasComplianceFooterMarker = /<!--\s*Compliance footer\s*-->/.test(html);
  const alreadyHasUnsubscribeMerge =
    hasComplianceFooterMarker ||
    /\{\{\s*unsubscribeLink\s*\}\}/i.test(html) ||
    /\{\{\s*unsubscribe_url\s*\}\}/i.test(html);
  return html.replace(/<a(\s[^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, content) => {
    const a = attrs || "";
    const hrefMatch = a.match(/href\s*=\s*["']([^"']*)["']/i);
    if (hrefMatch) {
      const val = hrefMatch[1].trim();
      if (val && val !== "#" && !/^\s*$/.test(val)) return match;
    }
    const text = (content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    let href = "#";
    if (/(^|\s)(email|contact|reach out|reply)(\s|$)/.test(text) || /^email$/.test(text)) href = "mailto:{{senderEmail}}";
    else if (/linkedin|linked in|connect/.test(text)) href = "{{senderLinkedinUrl}}";
    else if (!alreadyHasUnsubscribeMerge && /unsubscribe/.test(text)) href = "{{unsubscribeLink}}";
    else if (hasJob && /(apply|view job|learn more)/.test(text)) href = "{{jobUrl}}";
    else if (hasJob) href = "{{jobUrl}}";
    return `<a href="${href}"${a}>${content}</a>`;
  });
}

/**
 * Remove extra unsubscribe anchors above the compliance footer (starter/AI often add a stub link;
 * footer already has the canonical link). Safe for pre- and post-merge HTML.
 */
function stripDuplicateUnsubscribeBeforeComplianceFooter(html: string): string {
  const marker = "<!-- Compliance footer -->";
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  const head = html.slice(0, idx);
  const tail = html.slice(idx);
  const cleaned = head.replace(
    /<a\b[^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (full, href: string, inner: string) => {
      const text = inner.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().toLowerCase();
      if (text !== "unsubscribe") return full;
      const h = (href || "").trim();
      const isOurUnsubHref =
        h === "#" ||
        h === "" ||
        /\{\{\s*unsubscribeLink\s*\}\}/i.test(h) ||
        /\{\{\s*unsubscribe_url\s*\}\}/i.test(h) ||
        (/^https?:\/\//i.test(h) && /\/unsubscribe\?/.test(h));
      return isOurUnsubHref ? "" : full;
    },
  );
  return cleaned + tail;
}

