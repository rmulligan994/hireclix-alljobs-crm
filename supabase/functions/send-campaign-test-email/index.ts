import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TestEmailRequest {
  campaignId: string;
  recipientEmail: string; // Email address to send test to (usually current user)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    const MAILGUN_FROM = Deno.env.get("MAILGUN_FROM") || `Beacon CRM <noreply@${MAILGUN_DOMAIN}>`;

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { campaignId, recipientEmail }: TestEmailRequest = await req.json();

    if (!campaignId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "campaignId and recipientEmail required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name, user_id, job_id")
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
        JSON.stringify({ error: "No emails in sequence. Add at least one email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstEmail = campaignEmails[0];

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

    // Mock candidate using sender data so merge tags render sensibly
    const mockCandidate = {
      first_name: senderData.first_name || "Candidate",
      last_name: senderData.last_name || "Name",
      email: recipientEmail,
      company: senderData.company || "",
      title: senderData.title || "",
      location: "",
      source: "",
      tags: [],
      linkedin_url: "",
    };

    const baseUrl = org.base_url || Deno.env.get("APP_URL") || "";
    const testRecipientId = "test";
    const mergeContext = {
      candidate: mockCandidate,
      campaign,
      sender: senderData,
      org,
      job: jobData,
      recipientId: testRecipientId,
      baseUrl,
    };

    const personalizedSubject = replaceMergeTags(firstEmail.subject, mergeContext);
    let rawHtml = firstEmail.html_content || `<p>Hello ${mockCandidate.first_name},</p><p>This is a test email.</p>`;
    rawHtml = fixBrokenButtonLinks(rawHtml, !!jobData);
    let personalizedHtml = replaceMergeTags(rawHtml, mergeContext);

    const unsubscribeUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/unsubscribe?r=${testRecipientId}` : "#";
    const testFooter = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;font-family:Arial,sans-serif">
  <em>This is a test email. No unsubscribe needed.</em>
</div>`;
    personalizedHtml = appendUnsubscribeFooter(personalizedHtml, testFooter);

    const mailgunBaseUrl = Deno.env.get("MAILGUN_REGION") === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    const mailgunUrl = `${mailgunBaseUrl}/v3/${MAILGUN_DOMAIN}/messages`;

    const formData = new FormData();
    formData.append("from", MAILGUN_FROM);
    formData.append("to", recipientEmail);
    formData.append("subject", `[TEST] ${personalizedSubject}`);
    formData.append("html", personalizedHtml);

    const response = await fetch(mailgunUrl, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-campaign-test-email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    else if (/linkedin|linked in|connect/.test(text)) href = "#";
    else if (/unsubscribe/.test(text)) href = "#";
    else if (hasJob && /(apply|view job|learn more)/.test(text)) href = "#";
    else if (hasJob) href = "#";
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
