import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('BEE_CLIENT_ID');
    const clientSecret = Deno.env.get('BEE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('BeeFree credentials not configured');
      return new Response(
        JSON.stringify({ error: 'BeeFree credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get optional uid from request body
    let uid = 'default-user';
    try {
      const body = await req.json();
      if (body.uid) {
        uid = body.uid;
      }
    } catch {
      // No body or invalid JSON, use default uid
    }

    console.log('Authenticating with BeeFree for uid:', uid);

    // Call BeeFree's authentication endpoint
    const response = await fetch('https://auth.getbee.io/apiauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BeeFree auth failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'BeeFree authentication failed', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authData = await response.json();
    console.log('BeeFree auth successful');

    return new Response(
      JSON.stringify(authData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in beefree-auth function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
