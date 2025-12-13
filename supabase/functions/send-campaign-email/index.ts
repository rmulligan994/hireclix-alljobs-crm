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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
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

    // Get recipients to send to
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
          location
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

    console.log(`Found ${recipients.length} pending recipients`);

    // For now, send the first email in the sequence
    const firstEmail = campaignEmails[0];
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const candidate = recipient.candidates as any;
      
      if (!candidate?.email) {
        console.log(`Skipping recipient ${recipient.id} - no email address`);
        continue;
      }

      // Replace merge tags in subject and content
      const personalizedSubject = replaceMergeTags(firstEmail.subject, candidate, campaign);
      const personalizedHtml = firstEmail.html_content 
        ? replaceMergeTags(firstEmail.html_content, candidate, campaign)
        : `<p>Hello ${candidate.first_name || 'there'},</p><p>This is a campaign email.</p>`;

      try {
        console.log(`Sending email to ${candidate.email}`);

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Beacon CRM <noreply@product.hireclix.com>",
            to: [candidate.email],
            subject: personalizedSubject,
            html: personalizedHtml,
          }),
        });

        // Add delay to respect rate limits (2 requests per second max)
        await new Promise(resolve => setTimeout(resolve, 600));

        if (response.ok) {
          console.log(`Email sent successfully to ${candidate.email}`);
          
          // Update recipient status
          await supabase
            .from("campaign_recipients")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString() 
            })
            .eq("id", recipient.id);

          sentCount++;
        } else {
          const errorData = await response.text();
          console.error(`Failed to send to ${candidate.email}:`, errorData);
          errors.push(`${candidate.email}: ${errorData}`);
        }
      } catch (err) {
        console.error(`Error sending to ${candidate.email}:`, err);
        errors.push(`${candidate.email}: ${err.message}`);
      }
    }

    // Update campaign status if all emails sent
    if (campaign.status === 'scheduled' || campaign.status === 'draft') {
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
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-campaign-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function replaceMergeTags(content: string, candidate: any, campaign: any): string {
  return content
    .replace(/\{\{firstName\}\}/g, candidate.first_name || '')
    .replace(/\{\{lastName\}\}/g, candidate.last_name || '')
    .replace(/\{\{email\}\}/g, candidate.email || '')
    .replace(/\{\{company\}\}/g, candidate.company || '')
    .replace(/\{\{title\}\}/g, candidate.title || '')
    .replace(/\{\{location\}\}/g, candidate.location || '')
    .replace(/\{\{campaignName\}\}/g, campaign.name || '')
    .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{currentTime\}\}/g, new Date().toLocaleTimeString());
}
