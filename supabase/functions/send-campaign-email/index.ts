import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return await processCampaignSend(supabase, body.campaignId, body.recipientId, body.scheduledAt, corsHeaders);
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
        linkedin_url
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
    const recipientIds: string[] = [];
    for (const recipient of recipients) {
      const candidate = recipient.candidates as any;
      if (!candidate?.email) continue;

      const { error: insertErr } = await supabase.from("scheduled_emails").upsert(
        {
          campaign_id: campaignId,
          campaign_email_id: firstEmail.id,
          campaign_recipient_id: recipient.id,
          scheduled_at: scheduledAt,
          status: "pending",
        },
        { onConflict: "campaign_id,campaign_recipient_id,campaign_email_id" }
      );
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
      JSON.stringify({ success: true, sent: queued, total: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Immediate send: send step 1 to each recipient, insert next drip step
  let sentCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const candidate = recipient.candidates as any;
    if (!candidate?.email) continue;

    const result = await sendOneEmail(supabase, {
      campaignId,
      campaignEmailId: firstEmail.id,
      campaignRecipientId: recipient.id,
    });

    if (result.error) {
      errors.push(`${candidate.email}: ${result.error}`);
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
  if (!nextStep) return;

  const recurrence = campaign?.schedule_recurrence as { type?: string; dayOfWeek?: number; dayOfMonth?: number; time?: string; endOnDate?: string } | null;
  const scheduledAt = computeNextScheduledAt(recurrence, nextStep);

  // Respect endOnDate from schedule_recurrence (daily/weekly/monthly)
  if (recurrence?.endOnDate) {
    const endDate = new Date(recurrence.endOnDate);
    endDate.setHours(23, 59, 59, 999);
    if (scheduledAt > endDate) return; // Don't schedule past end date
  }

  await supabase.from("scheduled_emails").upsert(
    {
      campaign_id: campaignId,
      campaign_email_id: nextStep.id,
      campaign_recipient_id: campaignRecipientId,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
    },
    { onConflict: "campaign_id,campaign_recipient_id,campaign_email_id" }
  );
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
        linkedin_url
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
  const mergeContext = {
    candidate,
    campaign,
    sender: senderData,
    org,
    job: jobData,
    recipientId: recipient.id,
    baseUrl,
  };

  const personalizedSubject = replaceMergeTags(campaignEmail.subject, mergeContext);
  let rawHtml = campaignEmail.html_content || `<p>Hello ${candidate.first_name || "there"},</p><p>This is a campaign email.</p>`;
  rawHtml = fixBrokenButtonLinks(rawHtml, !!jobData);
  let personalizedHtml = replaceMergeTags(rawHtml, mergeContext);

  const unsubscribeUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/unsubscribe?r=${recipient.id}` : "#";
  const unsubscribeFooter = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">
  <a href="${unsubscribeUrl}" style="color:#54A3DA;text-decoration:underline">Unsubscribe</a> from future emails
</div>`;
  personalizedHtml = appendUnsubscribeFooter(personalizedHtml, unsubscribeFooter);

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

  const response = await fetch(mailgunUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
    body: formData,
  });

  await new Promise((r) => setTimeout(r, 200));

  if (!response.ok) {
    const errText = await response.text();
    return { error: errText };
  }

  const result = await response.json();
  const messageId = result.id;

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
    content: personalizedHtml.replace(/<[^>]*>/g, "").slice(0, 500),
    direction: "outbound",
    occurred_at: new Date().toISOString(),
    campaign_recipient_id: recipient.id,
    external_message_id: messageId,
    created_by: campaign.user_id,
  });

  return {};
}

function fixBrokenButtonLinks(html: string, hasJob: boolean): string {
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
    else if (/unsubscribe/.test(text)) href = "{{unsubscribeLink}}";
    else if (hasJob && /(apply|view job|learn more)/.test(text)) href = "{{jobUrl}}";
    else if (hasJob) href = "{{jobUrl}}";
    return `<a href="${href}"${a}>${content}</a>`;
  });
}

function appendUnsubscribeFooter(html: string, footer: string): string {
  const trimmed = html.trim();
  if (trimmed.endsWith("</body>")) return trimmed.replace(/<\/body>/i, `${footer}</body>`);
  return trimmed + footer;
}

function replaceMergeTags(content: string, ctx: {
  candidate: any;
  campaign: any;
  sender: any;
  org: any;
  job: any;
  recipientId: string;
  baseUrl: string;
}): string {
  const { candidate, campaign, sender, org, job, recipientId, baseUrl } = ctx;
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "";
  const skills = Array.isArray(candidate.tags) ? candidate.tags.join(", ") : (candidate.tags || "");
  const senderName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "";
  const senderCompany = org.company_name || sender.company || "";
  const unsubscribeLink = baseUrl ? `${baseUrl.replace(/\/$/, "")}/unsubscribe?r=${recipientId}` : "#";

  return content
    .replace(/\{\{firstName\}\}/g, candidate.first_name || "")
    .replace(/\{\{lastName\}\}/g, candidate.last_name || "")
    .replace(/\{\{fullName\}\}/g, fullName)
    .replace(/\{\{email\}\}/g, candidate.email || "")
    .replace(/\{\{company\}\}/g, candidate.company || "")
    .replace(/\{\{title\}\}/g, candidate.title || "")
    .replace(/\{\{skills\}\}/g, skills)
    .replace(/\{\{location\}\}/g, candidate.location || "")
    .replace(/\{\{source\}\}/g, candidate.source || "")
    .replace(/\{\{linkedinUrl\}\}/g, candidate.linkedin_url || "")
    .replace(/\{\{campaignName\}\}/g, campaign.name || "")
    .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{currentTime\}\}/g, new Date().toLocaleTimeString())
    .replace(/\{\{senderName\}\}/g, senderName)
    .replace(/\{\{senderTitle\}\}/g, sender.title || "")
    .replace(/\{\{senderCompany\}\}/g, senderCompany)
    .replace(/\{\{senderBrand\}\}/g, org.brand_name || "")
    .replace(/\{\{senderEmail\}\}/g, sender.email || "")
    .replace(/\{\{senderLinkedinUrl\}\}/g, sender.linkedin_url || "")
    .replace(/\{\{jobTitle\}\}/g, job?.title || "")
    .replace(/\{\{jobDepartment\}\}/g, job?.department || "")
    .replace(/\{\{jobLocation\}\}/g, job?.location || "")
    .replace(/\{\{jobType\}\}/g, job?.type || "")
    .replace(/\{\{jobDescription\}\}/g, job?.description || "")
    .replace(/\{\{jobUrl\}\}/g, job?.url || job?.view_url || "")
    .replace(/\{\{unsubscribeLink\}\}/g, unsubscribeLink)
    .replace(/\{\{viewInBrowserLink\}\}/g, "#");
}
