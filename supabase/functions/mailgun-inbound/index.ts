import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Mailgun Inbound Parse Webhook
 *
 * Receives inbound emails (e.g. replies) when configured in Mailgun Routes.
 * Configure: Mailgun Dashboard → Receiving → Create Route → Forward to:
 *   https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-inbound
 *
 * When a recipient replies to a campaign email, the reply includes In-Reply-To
 * with the original Message-ID. We match that to campaign_recipients.message_id
 * and update status to "responded".
 *
 * Requires: MX records pointing to Mailgun for your domain.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Mailgun Inbound sends multipart/form-data or application/x-www-form-urlencoded
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, string | string[]>;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {};
      formData.forEach((v, k) => {
        body[k] = typeof v === "string" ? v : "";
      });
    } else {
      body = await req.json();
    }

    // message-headers can be JSON string with array of [name, value] pairs
    const messageHeaders = body["message-headers"];
    let inReplyTo: string | null = null;

    if (messageHeaders) {
      try {
        const headers = typeof messageHeaders === "string" ? JSON.parse(messageHeaders) : messageHeaders;
        const arr = Array.isArray(headers) ? headers : [];
        for (const h of arr) {
          if (Array.isArray(h) && h.length >= 2) {
            const name = String(h[0]).toLowerCase();
            if (name === "in-reply-to" || name === "inreplyto") {
              inReplyTo = String(h[1]).trim();
              break;
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!inReplyTo) {
      console.log("No In-Reply-To header in inbound email");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize: Mailgun may wrap in < > or not
    const messageId = inReplyTo.startsWith("<") ? inReplyTo : `<${inReplyTo}>`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: recipient, error } = await supabase
      .from("campaign_recipients")
      .select("id")
      .eq("message_id", messageId)
      .single();

    if (error || !recipient) {
      console.log(`No campaign recipient found for In-Reply-To: ${messageId}`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("campaign_recipients")
      .update({
        status: "responded",
        responded_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);

    console.log(`Updated campaign_recipient ${recipient.id} as responded (reply detected)`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in mailgun-inbound:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
