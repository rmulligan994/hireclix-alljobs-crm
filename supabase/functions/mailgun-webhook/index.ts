import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Mailgun Webhook Handler
 *
 * Receives all Mailgun events and updates campaign_recipients analytics.
 *
 * Configure in Mailgun Dashboard → Sending → Webhooks for your domain.
 * Webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/mailgun-webhook
 *
 * Supported events (enable all in Mailgun):
 * - accepted, delivered, opened, clicked
 * - complained, unsubscribed
 * - permanent_fail, temporary_fail, rejected
 *
 * Required secrets: MAILGUN_WEBHOOK_SIGNING_KEY (from Mailgun domain webhook settings)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Mailgun webhook signature (HMAC-SHA256)
function verifySignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const message = encoder.encode(timestamp + token);

  return crypto.subtle
    .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) =>
      crypto.subtle.sign("HMAC", key, message)
    )
    .then((signatureBuffer) => {
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const computedSignature = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return computedSignature === signature;
    })
    .catch(() => false);
}

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
    const payload = await req.json();
    const { signature, "event-data": eventData } = payload;

    if (!signature || !eventData) {
      console.error("Invalid webhook payload: missing signature or event-data");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    const signingKey = Deno.env.get("MAILGUN_WEBHOOK_SIGNING_KEY");
    if (signingKey) {
      const isValid = await verifySignature(
        signingKey,
        signature.timestamp,
        signature.token,
        signature.signature
      );
      if (!isValid) {
        console.error("Webhook signature verification failed");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("MAILGUN_WEBHOOK_SIGNING_KEY not set - skipping verification");
    }

    const event = eventData.event;
    const timestamp = eventData.timestamp;
    const eventTime = new Date(timestamp * 1000).toISOString();

    // Extract recipient_id from custom variables (we pass v:recipient_id when sending)
    const userVariables = eventData["user-variables"] || eventData.user_variables || {};
    const recipientId = userVariables.recipient_id;

    // Fallback: lookup by message-id from headers (Mailgun may use Message-Id or message-id)
    const headers = eventData.message?.headers || {};
    const messageId = headers["message-id"] || headers["Message-Id"];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let campaignRecipientId: string | null = recipientId;

    if (!campaignRecipientId && messageId) {
      // Lookup by message_id stored in campaign_recipients
      const { data: recipient } = await supabase
        .from("campaign_recipients")
        .select("id")
        .eq("message_id", messageId)
        .single();
      campaignRecipientId = recipient?.id || null;
    }

    if (!campaignRecipientId) {
      console.log(`Webhook event ${event}: no campaign recipient found (recipient_id=${recipientId}, message-id=${messageId})`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update campaign_recipients based on event type
    const updateData: Record<string, unknown> = {};

    switch (event) {
      case "accepted":
        // Mailgun accepted the message into queue (we already mark sent on API response)
        break;

      case "delivered":
        // For scheduled emails: update status from "scheduled" to "sent"; set sent_at
        updateData.sent_at = eventTime;
        // Only set status to "sent" if currently "scheduled" (don't overwrite opened/clicked)
        updateData.status = "sent";
        break;

      case "opened":
        updateData.opened_at = eventTime;
        updateData.status = "opened";
        break;

      case "clicked":
        updateData.clicked_at = eventTime;
        updateData.status = "clicked";
        break;

      case "complained":
        updateData.status = "complained";
        break;

      case "unsubscribed":
        updateData.status = "unsubscribed";
        break;

      case "permanent_fail":
        updateData.status = "bounced";
        break;

      case "temporary_fail":
      case "failed":
        updateData.status = "failed";
        break;

      case "rejected":
        updateData.status = "rejected";
        break;

      default:
        console.log(`Unhandled Mailgun event: ${event}`);
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("campaign_recipients")
        .update(updateData)
        .eq("id", campaignRecipientId);

      if (error) {
        console.error(`Failed to update campaign_recipient ${campaignRecipientId}:`, error);
      } else {
        console.log(`Updated campaign_recipient ${campaignRecipientId} for event ${event}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mailgun-webhook:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
