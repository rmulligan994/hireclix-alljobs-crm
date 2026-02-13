import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  campaignId: string;
  recipientId?: string; // If provided, send to specific recipient; otherwise send to all pending
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    const MAILGUN_FROM = Deno.env.get("MAILGUN_FROM") || `Beacon CRM <noreply@${MAILGUN_DOMAIN}>`;

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("MAILGUN_API_KEY and MAILGUN_DOMAIN must be configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, recipientId }: SendEmailRequest = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing campaign ${campaignId}`);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign emails (the sequence)
    const { data: campaignEmails, error: emailsError } = await supabase
      .from("campaign_emails")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("step_order", { ascending: true });

    if (emailsError || !campaignEmails || campaignEmails.length === 0) {
      console.error("No campaign emails found:", emailsError);
      return new Response(
        JSON.stringify({ error: "No emails configured for this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipients to send to (pending only; unsubscribed/bounced/complained are excluded)
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
      .eq("status", "pending");

    if (recipientId) {
      recipientsQuery = recipientsQuery.eq("id", recipientId);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recipients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients || recipients.length === 0) {
      console.log("No pending recipients to send to");
      return new Response(
        JSON.stringify({ message: "No pending recipients", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch sender (campaign owner profile) and org settings for merge tags
    const { data: sender } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, company")
      .eq("user_id", campaign.user_id)
      .single();
    const senderData = sender || { first_name: "", last_name: "", email: "", company: "" };

    const { data: orgRows } = await supabase
      .from("organization_settings")
      .select("company_name, brand_name, base_url")
      .limit(1);
    const org = orgRows?.[0] || { company_name: "", brand_name: "", base_url: "" };

    console.log(`Found ${recipients.length} pending recipients`);

    // For now, send the first email in the sequence
    const firstEmail = campaignEmails[0];
    let sentCount = 0;
    const errors: string[] = [];

    // Mailgun API: US region (use https://api.eu.mailgun.net for EU)
    const mailgunBaseUrl = Deno.env.get("MAILGUN_REGION") === "EU"
      ? "https://api.eu.mailgun.net"
      : "https://api.mailgun.net";
    const mailgunUrl = `${mailgunBaseUrl}/v3/${MAILGUN_DOMAIN}/messages`;

    for (const recipient of recipients) {
      const candidate = recipient.candidates as any;

      if (!candidate?.email) {
        console.log(`Skipping recipient ${recipient.id} - no email address`);
        continue;
      }

      // Replace merge tags in subject and content
      const mergeContext = {
        candidate,
        campaign,
        sender: senderData,
        org,
        recipientId: recipient.id,
        baseUrl: org.base_url || Deno.env.get("APP_URL") || "",
      };
      const personalizedSubject = replaceMergeTags(firstEmail.subject, mergeContext);
      const personalizedHtml = firstEmail.html_content
        ? replaceMergeTags(firstEmail.html_content, mergeContext)
        : `<p>Hello ${candidate.first_name || "there"},</p><p>This is a campaign email.</p>`;

      try {
        console.log(`Sending email to ${candidate.email}`);

        // Mailgun expects multipart/form-data
        const formData = new FormData();
        formData.append("from", MAILGUN_FROM);
        formData.append("to", candidate.email);
        formData.append("subject", personalizedSubject);
        formData.append("html", personalizedHtml);
        formData.append("o:tracking", "yes"); // Enable open and click tracking for analytics
        formData.append("o:tag", `campaign-${campaignId}`); // Tag for Mailgun analytics
        // Custom metadata for webhook correlation (visible in events)
        formData.append("v:recipient_id", recipient.id);
        formData.append("v:campaign_id", campaignId);
        formData.append("v:candidate_id", recipient.candidate_id);

        const response = await fetch(mailgunUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
          },
          body: formData,
        });

        // Add delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (response.ok) {
          const result = await response.json();
          const messageId = result.id; // e.g. "<20230201120000.1.ABC123@domain.com>"

          console.log(`Email sent successfully to ${candidate.email}, message-id: ${messageId}`);

          // Update recipient status and store message_id for webhook correlation
          await supabase
            .from("campaign_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              message_id: messageId,
            })
            .eq("id", recipient.id);

          // Log to communications for activity feed and analytics
          await supabase.from("communications").insert({
            candidate_id: recipient.candidate_id,
            type: "email",
            subject: personalizedSubject,
            content: personalizedHtml.replace(/<[^>]*>/g, "").slice(0, 500), // Plain text excerpt
            direction: "outbound",
            occurred_at: new Date().toISOString(),
            campaign_recipient_id: recipient.id,
            external_message_id: messageId,
          });

          sentCount++;
        } else {
          const errorData = await response.text();
          console.error(`Failed to send to ${candidate.email}:`, errorData);
          errors.push(`${candidate.email}: ${errorData}`);
        }
      } catch (err) {
        console.error(`Error sending to ${candidate.email}:`, err);
        errors.push(`${candidate.email}: ${(err as Error).message}`);
      }
    }

    // Update campaign status if all emails sent
    if (campaign.status === "scheduled" || campaign.status === "draft") {
      await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaignId);
    }

    console.log(`Campaign ${campaignId}: Sent ${sentCount} emails`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-campaign-email:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replaceMergeTags(content: string, ctx: {
  candidate: any;
  campaign: any;
  sender: any;
  org: any;
  recipientId: string;
  baseUrl: string;
}): string {
  const { candidate, campaign, sender, org, recipientId, baseUrl } = ctx;
  const fullName = [candidate.first_name, candidate.last_name].filter(Boolean).join(" ") || "";
  const skills = Array.isArray(candidate.tags) ? candidate.tags.join(", ") : (candidate.tags || "");
  const senderName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "";
  const senderCompany = org.company_name || sender.company || "";
  const unsubscribeLink = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/unsubscribe?r=${recipientId}`
    : "#";

  return content
    .replace(/\{\{firstName\}\}/g, candidate.first_name || "")
    .replace(/\{\{lastName\}\}/g, candidate.last_name || "")
    .replace(/\{\{fullName\}\}/g, fullName)
    .replace(/\{\{email\}\}/g, candidate.email || "")
    .replace(/\{\{company\}\}/g, candidate.company || "")
    .replace(/\{\{title\}\}/g, candidate.title || "")
    .replace(/\{\{jobTitle\}\}/g, candidate.title || "")
    .replace(/\{\{skills\}\}/g, skills)
    .replace(/\{\{location\}\}/g, candidate.location || "")
    .replace(/\{\{source\}\}/g, candidate.source || "")
    .replace(/\{\{linkedinUrl\}\}/g, candidate.linkedin_url || "")
    .replace(/\{\{campaignName\}\}/g, campaign.name || "")
    .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{currentTime\}\}/g, new Date().toLocaleTimeString())
    .replace(/\{\{senderName\}\}/g, senderName)
    .replace(/\{\{senderCompany\}\}/g, senderCompany)
    .replace(/\{\{senderBrand\}\}/g, org.brand_name || "")
    .replace(/\{\{senderEmail\}\}/g, sender.email || "")
    .replace(/\{\{unsubscribeLink\}\}/g, unsubscribeLink)
    .replace(/\{\{viewInBrowserLink\}\}/g, "#");
}
