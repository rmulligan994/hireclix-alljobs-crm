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

    if (!dueEmails || dueEmails.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No due emails to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const edgeUrl = `${supabaseUrl}/functions/v1/send-campaign-email`;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || supabaseKey;
    let processed = 0;
    const errors: string[] = [];

    for (const row of dueEmails) {
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

    return new Response(
      JSON.stringify({
        processed,
        total: dueEmails.length,
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
