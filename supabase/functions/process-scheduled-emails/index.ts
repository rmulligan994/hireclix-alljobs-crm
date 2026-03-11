import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all pending scheduled emails that are due (scheduled_at <= now)
    const now = new Date().toISOString();
    const { data: dueEmails, error: fetchError } = await supabase
      .from("scheduled_emails")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .limit(100); // Process in batches to avoid timeout

    if (fetchError) {
      console.error("Error fetching scheduled emails:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const edgeUrl = `${supabaseUrl}/functions/v1/send-campaign-email`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseKey;
    let processed = 0;
    const errors: string[] = [];

    // 1. Process due scheduled_emails (step 2+ of drip sequences)
    for (const row of dueEmails || []) {
      try {
        const res = await fetch(edgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ scheduledEmailId: row.id }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          processed++;
        } else {
          errors.push(`scheduled_emails ${row.id}: ${data.error || res.statusText}`);
        }
      } catch (err) {
        errors.push(`scheduled_emails ${row.id}: ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 300)); // Rate limit between calls
    }

    // 2. Process active campaigns with pending recipients (step 1 not yet sent — e.g. launch failed or recipients added later)
    const { data: pendingRecipients } = await supabase
      .from("campaign_recipients")
      .select("campaign_id")
      .eq("status", "pending");

    const campaignIdsWithPending = [...new Set((pendingRecipients || []).map((r: { campaign_id: string }) => r.campaign_id))];
    const activeCampaigns = campaignIdsWithPending.length > 0
      ? (await supabase.from("campaigns").select("id").eq("status", "active").in("id", campaignIdsWithPending)).data ?? []
      : [];

    for (const campaign of activeCampaigns) {
      try {
        const res = await fetch(edgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ campaignId: campaign.id }),
        });

        const data = await res.json();
        if (res.ok && data.sent > 0) {
          processed += data.sent;
        } else if (!res.ok) {
          errors.push(`campaign ${campaign.id}: ${data.error || res.statusText}`);
        }
      } catch (err) {
        errors.push(`campaign ${campaign.id}: ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 300)); // Rate limit between calls
    }

    return new Response(
      JSON.stringify({
        processed,
        scheduledEmails: dueEmails?.length ?? 0,
        pendingCampaigns: activeCampaigns?.length ?? 0,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-scheduled-emails:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
