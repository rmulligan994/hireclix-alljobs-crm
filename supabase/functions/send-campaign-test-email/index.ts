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
    const mergeContext: MergeContext = {
      candidate: mockCandidate,
      campaign,
      sender: senderData,
      org,
      job: jobData,
      recipientId: testRecipientId,
      baseUrl,
    };

    const personalizedSubject = replaceMergeTags(firstEmail.subject ?? "", mergeContext);
    let rawHtml = firstEmail.html_content || `<p>Hello ${mockCandidate.first_name},</p><p>This is a test email.</p>`;
    rawHtml = fixBrokenButtonLinks(rawHtml, !!jobData);
    rawHtml = stripDuplicateUnsubscribeBeforeComplianceFooter(rawHtml);
    let personalizedHtml = replaceMergeTags(rawHtml, mergeContext);
    personalizedHtml = stripDuplicateUnsubscribeBeforeComplianceFooter(personalizedHtml);

    const mergeResolved = assertFullyResolvedMergeTags(personalizedSubject, personalizedHtml);
    if (!mergeResolved.ok) {
      return new Response(
        JSON.stringify({
          error: `Unknown or unsupported merge tags: ${mergeResolved.keys.map((k) => "{{" + k + "}}").join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    personalizedHtml = prependTopPadding(personalizedHtml, 24);

    const mailgunBaseUrl = Deno.env.get("MAILGUN_REGION") === "EU" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    const mailgunUrl = `${mailgunBaseUrl}/v3/${MAILGUN_DOMAIN}/messages`;

    const formData = new FormData();
    formData.append("from", MAILGUN_FROM);
    formData.append("to", recipientEmail);
    formData.append("subject", `[TEST] ${personalizedSubject}`);
    formData.append("html", personalizedHtml);
    formData.append("v:campaign_id", campaignId);
    formData.append("v:test", "true");
    formData.append("v:has_job", jobData ? "true" : "false");

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
      return new Response(
        JSON.stringify({ error: errText || `Mailgun error (${response.status})` }),
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

