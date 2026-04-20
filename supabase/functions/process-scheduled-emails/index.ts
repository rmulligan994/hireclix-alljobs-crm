import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function envInt(name: string, defaultVal: number): number {
  const v = Deno.env.get(name);
  if (v == null || v === "") return defaultVal;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
}

/**
 * Drain due scheduled_emails in chunks. Tunable for production volume (set in Supabase secrets):
 * - PROCESS_SCHEDULED_EMAILS_BATCH — rows fetched per DB round (default 400)
 * - PROCESS_SCHEDULED_EMAILS_DELAY_MS — pause between child function calls (default 50)
 * - PROCESS_SCHEDULED_EMAILS_MAX_RUNTIME_MS — stop after this many ms (default 230000, stay under edge timeout)
 * - PROCESS_SCHEDULED_EMAILS_MAX_ROUNDS — cap DB fetch rounds per invocation (default 80)
 *
 * The old fixed limit of 100 was only to reduce the chance of hitting the Edge Function wall clock;
 * it is not a product requirement. Child calls still run sequentially; for very high volume, shorten
 * DELAY_MS if Mailgun allows, raise BATCH/ROUNDS, or run cron more often than hourly.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const batchSize = envInt("PROCESS_SCHEDULED_EMAILS_BATCH", 400);
    const delayMs = envInt("PROCESS_SCHEDULED_EMAILS_DELAY_MS", 50);
    const maxRuntimeMs = envInt("PROCESS_SCHEDULED_EMAILS_MAX_RUNTIME_MS", 230000);
    const maxRounds = envInt("PROCESS_SCHEDULED_EMAILS_MAX_ROUNDS", 80);

    const edgeUrl = `${supabaseUrl}/functions/v1/send-campaign-email`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseKey;
    const started = Date.now();

    let processed = 0;
    let scheduledEmailRowsTouched = 0;
    const errors: string[] = [];

    // 1. Process due scheduled_emails in rounds until empty, time budget, or round cap
    for (let round = 0; round < maxRounds; round++) {
      if (Date.now() - started >= maxRuntimeMs) break;

      const now = new Date().toISOString();
      const { data: dueEmails, error: fetchError } = await supabase
        .from("scheduled_emails")
        .select("id")
        .eq("status", "pending")
        .lte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(batchSize);

      if (fetchError) {
        console.error("Error fetching scheduled emails:", fetchError);
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!dueEmails?.length) break;

      for (const row of dueEmails) {
        if (Date.now() - started >= maxRuntimeMs) break;

        scheduledEmailRowsTouched++;
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
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
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
      if (Date.now() - started >= maxRuntimeMs) break;

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
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        scheduledEmailInvocations: scheduledEmailRowsTouched,
        pendingCampaigns: activeCampaigns?.length ?? 0,
        durationMs: Date.now() - started,
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
