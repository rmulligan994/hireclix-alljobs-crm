import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    let recipientId = url.searchParams.get("r");
    let candidateId = url.searchParams.get("c");

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (!recipientId) recipientId = body?.r ?? body?.recipientId ?? null;
        if (!candidateId) candidateId = body?.c ?? body?.candidateId ?? null;
      } catch {
        // ignore parse error
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (candidateId) {
      const { data: cand, error: candErr } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .maybeSingle();

      if (candErr || !cand) {
        return new Response(
          JSON.stringify({ error: "Invalid unsubscribe link" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("candidates")
        .update({ marketing_email_unsubscribed: true })
        .eq("id", candidateId);

      return new Response(
        JSON.stringify({ success: true, message: "You have been unsubscribed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: "Missing recipient parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: recipient, error: fetchError } = await supabase
      .from("campaign_recipients")
      .select("id, status")
      .eq("id", recipientId)
      .single();

    if (fetchError || !recipient) {
      return new Response(
        JSON.stringify({ error: "Invalid unsubscribe link" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("campaign_recipients")
      .update({ status: "unsubscribed" })
      .eq("id", recipientId);

    return new Response(
      JSON.stringify({ success: true, message: "You have been unsubscribed." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in unsubscribe:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
