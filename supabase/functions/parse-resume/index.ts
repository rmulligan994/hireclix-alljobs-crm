/**
 * Resume parse Edge Function - uses OpenAI to extract candidate data from resume text.
 * Handles any resume format (LinkedIn PDF, standard resume, etc.).
 *
 * Secret: OPENAI_API_KEY (set via supabase secrets set OPENAI_API_KEY=sk-...)
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseResumeRequest {
  text: string;
}

interface ParsedCandidate {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  linkedinUrl: string | null;
  tags: string[];
}

const CANDIDATE_SCHEMA = `{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "company": "string or null (current/most recent)",
  "title": "string or null (current/most recent job title)",
  "location": "string or null",
  "linkedinUrl": "string or null (full URL if present)",
  "tags": "array of up to 4 strings - the most important/relevant skills, technologies, or keywords only"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Resume parsing not configured. Set OPENAI_API_KEY in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ParseResumeRequest = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length < 50) {
      return new Response(
        JSON.stringify({ error: "Resume text too short to parse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Extract candidate information from this resume/CV text. Return a JSON object matching this schema exactly. Use null for missing fields. For tags, return only the 4 most important/relevant skills or technologies (prioritize core competencies and job-relevant keywords). For name, split into firstName and lastName. For linkedinUrl, use the full URL if a LinkedIn profile link appears.

Schema: ${CANDIDATE_SCHEMA}

Resume text:
---
${text.slice(0, 12000)}
---`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", response.status, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse resume",
          detail: response.status === 401 ? "Invalid OpenAI API key" : errText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: ParsedCandidate;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize
    const profile: ParsedCandidate = {
      firstName: parsed.firstName ?? null,
      lastName: parsed.lastName ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      company: parsed.company ?? null,
      title: parsed.title ?? null,
      location: parsed.location ?? null,
      linkedinUrl: parsed.linkedinUrl ?? null,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === "string").slice(0, 4)
        : [],
    };

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-resume error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to parse resume", detail: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
