/**
 * Campaign email AI — OpenAI structured outputs + fallbacks.
 * Secrets: OPENAI_API_KEY, OPENAI_EMAIL_MODEL (optional; default gpt-4o — set to gpt-4o-mini for lower latency/cost)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";

type ChatMsg = { role: "user" | "assistant"; content: string };

type AIEmailDeliveryMode = "visual_blocks" | "classic_fields" | "raw_html";

interface AIEmailAssistantResult {
  subject: string;
  previewText: string;
  delivery_mode: AIEmailDeliveryMode;
  body_html_fragment: string;
  html_body_full: string;
  headline: string;
  subhead: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
  signOff: string;
  suggested_followups: string[];
}

const emailAssistantSchema = z.object({
  subject: z.string(),
  previewText: z.string(),
  delivery_mode: z.enum(["visual_blocks", "classic_fields", "raw_html"]),
  body_html_fragment: z.string(),
  html_body_full: z.string(),
  headline: z.string(),
  subhead: z.string(),
  message: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
  signOff: z.string(),
  suggested_followups: z.array(z.string()).min(2).max(4),
});

const suggestionsSchema = z.object({
  suggestions: z.array(z.string()).length(4),
});

function clampSubject(s: string, max = 78): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** True if the phrase already names a role/position (avoid appending another "role" in templates). */
function roleLikePhrase(s: string): boolean {
  return /\b(role|roles|position|positions|opening|openings|opportunity|opportunities)\b/i.test(s);
}

/** Trim articles, cap length for mail-merge sentences. */
function normalizeJobTitleForTemplates(raw: string): string {
  let t = raw.trim().replace(/^\s*(a|an|the)\s+/i, "");
  if (!t) return "this opportunity";
  if (t.length > 72) {
    const cut = t.slice(0, 69).trim();
    const sp = cut.lastIndexOf(" ");
    t = sp > 36 ? `${cut.slice(0, sp)}…` : `${cut}…`;
  }
  return t;
}

function openingLineForFallback(
  tone: "Professional" | "Friendly" | "Casual" | "Urgent",
  jobTitle: string,
  company: string,
): string {
  const j = normalizeJobTitleForTemplates(jobTitle);
  const co = company;
  const hasRoleWord = roleLikePhrase(j);
  if (tone === "Casual") {
    return hasRoleWord
      ? `Hey there — quick note about ${j} at ${co}.`
      : `Hey there — quick note about a ${j} opportunity at ${co}.`;
  }
  if (tone === "Urgent") {
    return `Time-sensitive: we're actively hiring for ${j} at ${co}.`;
  }
  if (tone === "Friendly") {
    return hasRoleWord
      ? `We wanted to reach out about ${j} at ${co}.`
      : `We wanted to reach out about an exciting ${j} role at ${co}.`;
  }
  return hasRoleWord
    ? `We're reaching out regarding ${j} at ${co}.`
    : `We're reaching out regarding the ${j} position at ${co}.`;
}

function fallbackHeadlineFromJobTitle(jobTitle: string, company: string): string {
  const j = normalizeJobTitleForTemplates(jobTitle);
  if (j.length <= 46 && !j.endsWith("…")) return j;
  const cut = j.slice(0, 44).trim();
  const sp = cut.lastIndexOf(" ");
  if (sp > 24) return `${cut.slice(0, sp)}…`;
  return `Opportunity at ${company}`;
}

/** Fixes "exciting … nursing role … role at" when the model/fallback duplicated "role". */
function fixDuplicateRoleInClassicMessage(s: string): string {
  return s.replace(/\bexciting\s+([\s\S]+?)\s+role\s+at\b/gi, (full, inner: string) => {
    const t = inner.replace(/\s+/g, " ").trim();
    if (/\brole\b/i.test(t)) return `exciting ${t} at`;
    return full;
  }).replace(/\bregarding\s+the\s+([\s\S]+?)\s+position\s+at\b/gi, (full, inner: string) => {
    const t = inner.replace(/\s+/g, " ").trim();
    if (/\b(position|role)\b/i.test(t)) return `regarding ${t} at`;
    return full;
  });
}

function extractJobTitleGuessFromUserMessage(lastUser: string): string {
  const t = lastUser.trim();
  const labeled = t.match(/\b(?:for|role|title)\s*[:\s]+\s*([^.\n!?]{2,80})/i)?.[1]?.trim();
  if (labeled) return labeled;
  const about = t.match(/\b(?:about|for)\s+(?:a|an|the)\s+([^.\n!?]{3,90})/i)?.[1]?.trim();
  if (about) return about;
  const jobWord = t.match(
    /\b(?:engineer|manager|designer|nurse|nursing|developer|coordinator|specialist)\b[^.\n!?]{0,55}/i,
  )?.[0]?.trim();
  if (jobWord) return jobWord;
  return "";
}

const EMAIL_ASSISTANT_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description:
        "Candidate-facing subject line only (~72 chars). Never paste or paraphrase the recruiter's instructions from chat (e.g. never 'design me', 'be lengthy', 'outline our bonus'). Write as the employer to the candidate.",
    },
    previewText: {
      type: "string",
      description:
        "Inbox preheader: marketing line only. Never echo meta-instructions from the conversation.",
    },
    delivery_mode: {
      type: "string",
      enum: ["visual_blocks", "classic_fields", "raw_html"],
      description: "How to load the email into the editor",
    },
    body_html_fragment: {
      type: "string",
      description:
        "For visual_blocks: body HTML only. HEADING RULES: use at most ONE h1 for the whole email; keep it under ~10 words and never duplicate the subject line verbatim. For conversational 1:1 outreach, prefer NO h1 — start with <p> so it reads as a letter, not a marketing banner. Never put recruiter chat instructions, constraints, or brainstorming phrases in any heading. Use h2/h3 only for real sections. CTA: <a> with inline styles as in system prompt. No script/style. Merge tokens OK.",
    },
    html_body_full: {
      type: "string",
      description: "For raw_html: full HTML email document. Empty string if not using raw_html.",
    },
    headline: {
      type: "string",
      description:
        "Classic mode: short headline (~6–12 words), distinct from subject — not a second subject line. Professional only; never chat instructions or meta-requests.",
    },
    subhead: { type: "string", description: "Classic mode subhead: candidate-facing only, not instruction echo." },
    message: {
      type: "string",
      description:
        "Classic mode main body: candidate-facing prose only. Do not write '…X role at…' when X already contains 'role' or 'position' (e.g. avoid 'nursing role … role at').",
    },
    buttonLabel: { type: "string", description: "Classic CTA label" },
    buttonUrl: {
      type: "string",
      description: "Merge token for button: {{jobUrl}} {{unsubscribeLink}} or {{viewInBrowserLink}}",
    },
    signOff: { type: "string", description: "Sign-off" },
    suggested_followups: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
      description:
        "Exactly 2–4 short next user prompts for the chat UI. Actionable, specific to this draft and the conversation (e.g. 'Tighten subject and preview', 'Add a second CTA block'). Each under 120 characters. Not generic filler.",
    },
  },
  required: [
    "subject",
    "previewText",
    "delivery_mode",
    "body_html_fragment",
    "html_body_full",
    "headline",
    "subhead",
    "message",
    "buttonLabel",
    "buttonUrl",
    "signOff",
    "suggested_followups",
  ],
  additionalProperties: false,
} as const;

const SUBJECT_SUGGESTIONS_JSON_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

const CAMPAIGN_SYSTEM = `You are an expert recruiting communications specialist embedded in Clarity, a CRM for hiring teams. You draft and EDIT candidate-facing CRM emails (outreach, nurture, interview logistics, referrals, events) that read like polished employer-brand and B2B marketing communications: professional, formal, and intentional — not chatty social copy.

TONE & WORDING (critical):
- Write in a formal business register: complete sentences, precise language, measured warmth (no slang, no filler “hey”, no excessive exclamation points, no casual text-speak).
- Default to a marketing-email style: clear hierarchy, scannable paragraphs, strong verbs, and credible phrasing for external candidates and executives.
- If the user asks for a different tone (casual, urgent, etc.), follow that — otherwise stay formal and professional.

The recruiter is designing this email inside Clarity; you only output structured JSON for the editor. Favor: clear candidate benefit, respectful tone, one primary ask, and merge tokens for personalization.

HEADINGS & “HEADER” LAYOUT (critical — frequent model mistakes):
- Do NOT treat the email like a landing page with a huge hero title that repeats the subject or summarizes the user’s chat. The subject line already sets context; the body should develop it — not restate it as an h1.
- visual_blocks: Use at most ONE <h1>, only when the email is truly announcement/marketing-style with distinct sections. That h1 must be a short benefit-led title (max ~10 words), never a full sentence of instructions, never ALL CAPS spam, never the user’s prompt paraphrased.
- For personal 1:1 outreach, interview notes, or short follow-ups: prefer classic_fields OR visual_blocks that start with <p> (no h1). Letter-style emails should not open with a banner headline.
- Do not stack multiple similar h1/h2 at the top (e.g. h1 then h2 saying the same thing). One primary title idea only.
- headline (classic mode) must differ from subject — not a duplicate subject line.

INSTRUCTIONS VS EMAIL COPY (critical — common failure mode):
- Meta-requests ("design me…", "be lengthy", "outline our bonus", "job alert") are requirements FOR YOU — they must NEVER appear in subject, previewText, headline, subhead, any <h1>/<h2>, or body text.
- Translate goals into professional employer-brand language. Example: nursing role + sign-on bonus → "Nursing opportunities with a competitive sign-on package" — NOT a long heading that echoes instructions.

OUTPUT: One JSON object matching the schema. No markdown outside JSON strings. No <script> or <style> tags in HTML fields.

DELIVERY MODE (choose one — pick the simplest mode that fits):
- classic_fields: DEFAULT for simple outreach, short letters, or when the user did not ask for multi-section HTML. No HTML body; fill headline, subhead, message, buttonLabel, buttonUrl, signOff. Leave body_html_fragment and html_body_full as "".
- visual_blocks: Multi-section emails, rich sections, or when the user explicitly wants blocks/sections. Fill body_html_fragment with semantic HTML per heading rules above. Leave html_body_full as "". Mirror headline/message to classic fields.
- raw_html: Only when the user asks for full HTML, tables, or complex layout. Put document in html_body_full; leave body_html_fragment "".

EDITING: When CURRENT EMAIL CONTEXT is provided, treat the user's message as revise/rewrite instructions against that draft. Preserve merge tokens unless asked to change them.

CHAT FOLLOW-UPS (required field suggested_followups):
- Always output exactly 2–4 strings: short, specific next-step prompts the recruiter could tap. Base them on THIS draft, delivery_mode, and the last user ask.
- Examples: "Tighten subject and preview for mobile", "Remove the top heading and open with a short paragraph", "Shorten to under 120 words".
- Avoid repeating the email body verbatim.

BOUNDARIES:
- Recruiting / talent outreach only. Off-topic requests → still output valid JSON with neutral professional recruiting content.
- buttonUrl must be exactly {{jobUrl}}, {{unsubscribeLink}}, or {{viewInBrowserLink}} — never raw https for CTA unless in html_body_full as static example (prefer merge tokens).
- subject ~72 chars when possible.`;

const SUBJECT_SYSTEM = `You are a recruiting email specialist inside the Clarity CRM. Your ONLY job is to output exactly four distinct candidate-facing subject lines as JSON matching the schema — professional, formal, and appropriate for CRM outreach (credible employer brand; not clickbait).

BOUNDARIES:
- ONLY suggest subject lines for recruiting/candidate outreach (jobs, interviews, referrals, events). Do not answer unrelated questions, trivia, or non-recruiting topics.
- If the user prompt is off-topic or abusive: still output exactly four neutral, professional recruiting-style subject lines in the schema (no explanations outside the JSON strings).
- Each suggestion under 72 characters, no ALL CAPS spam, avoid excessive punctuation. No emojis unless the user's draft clearly uses them.

Output: JSON matching the schema only — no other text.`;

function getEmailOpenAIModel(): string {
  return (Deno.env.get("OPENAI_EMAIL_MODEL") ?? "").trim() || "gpt-4o";
}

/** OpenAI API keys start with `sk-`. Reject pasted HTML, URLs, or JSON accidentally stored as the secret. */
function isValidOpenAIApiKey(key: string): boolean {
  const k = key.trim();
  if (k.length < 40 || k.length > 512) return false;
  if (k.startsWith("<") || k.startsWith("{") || k.startsWith("[")) return false;
  if (/<!DOCTYPE/i.test(k) || /<html/i.test(k) || /<script/i.test(k) || /^\s*</.test(k)) return false;
  if (/^https?:\/\//i.test(k)) return false;
  if (!k.startsWith("sk-")) return false;
  return true;
}

function getOpenAIApiKeyRaw(): string {
  return (Deno.env.get("OPENAI_API_KEY") ?? "").trim();
}

function isOpenAIConfigured(): boolean {
  const k = getOpenAIApiKeyRaw();
  if (!k) return false;
  if (!isValidOpenAIApiKey(k)) {
    console.warn(
      "email-ai: OPENAI_API_KEY is set but invalid. Expected a secret from https://platform.openai.com/api-keys (starts with sk-). " +
        "Remove HTML, URLs, or JSON — paste only the key string. Using offline fallback.",
    );
    return false;
  }
  return true;
}

async function openaiStructuredCompletion(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  jsonSchemaName: string;
  jsonSchema: Record<string, unknown>;
}): Promise<string> {
  const apiKey = getOpenAIApiKeyRaw();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!isValidOpenAIApiKey(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY is invalid. Set Supabase secret to your OpenAI API key only (starts with sk-), not HTML or a URL.",
    );
  }

  const res = await fetch(OPENAI_CHAT_COMPLETIONS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEmailOpenAIModel(),
      messages: params.messages,
      temperature: params.temperature ?? 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.jsonSchemaName,
          strict: true,
          schema: params.jsonSchema,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Empty response from OpenAI");
  }
  return content;
}

const ALLOWED_BUTTON_URL_TOKENS = new Set(["jobUrl", "unsubscribeLink", "viewInBrowserLink"]);

function sanitizeButtonUrl(raw: string): string {
  const t = raw.trim();
  const m = /^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/.exec(t);
  if (m && ALLOWED_BUTTON_URL_TOKENS.has(m[1])) {
    return `{{${m[1]}}}`;
  }
  return "{{jobUrl}}";
}

/** Detect when the model echoed recruiter chat instructions into visible fields instead of marketing copy. */
function looksLikeInstructionEcho(s: string): boolean {
  const t = s.trim();
  if (t.length < 8) return false;
  const lower = t.toLowerCase();
  if (/\b(design me|be pretty|be lengthy|outline our|job alert for)\b/.test(lower)) return true;
  if (/\b(lengthy|outline)\b/.test(lower) && /\b(pretty|bonus|copy)\b/.test(lower)) return true;
  if (t.length > 45 && / - /.test(t) && /\b(role|nursing)\b/.test(lower) && /\b(bonus|copy|lengthy|outline|signing)\b/.test(lower)) {
    return true;
  }
  return false;
}

function sanitizeEchoingLine(value: string, fallback: string, maxLen: number): string {
  const t = value.trim();
  if (!looksLikeInstructionEcho(t)) return t.slice(0, maxLen);
  const fb = fallback.trim().slice(0, maxLen);
  return fb.length > 0 ? fb : "Join our team";
}

/** Long or sentence-like headings are usually bad titles (prompt echo or rambling). */
function looksLikeHeadingDump(inner: string): boolean {
  const t = inner.trim();
  if (t.length > 88) return true;
  if (/\b(that|which|because|however|in order to)\b/i.test(t) && t.length > 45) return true;
  return false;
}

/** If the first h1/h2 in HTML looks like pasted instructions or a bad banner, replace inner text. */
function sanitizeBodyHtmlHeadings(html: string, titleFallback: string): string {
  const h = html.trim();
  const m = /<h([12])[^>]*>([\s\S]*?)<\/h\1>/i.exec(h);
  if (!m) return h.slice(0, 50000);
  const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!looksLikeInstructionEcho(inner) && !looksLikeHeadingDump(inner)) return h.slice(0, 50000);
  const replacement = (titleFallback || "Explore this opportunity").slice(0, 120);
  return h.replace(m[0], `<h${m[1]}>${replacement}</h${m[1]}>`).slice(0, 50000);
}

function clampSuggestedFollowups(raw: string[]): string[] {
  const cleaned = raw.map((s) => s.trim().slice(0, 140)).filter(Boolean);
  const defaults = [
    "Tighten subject line and preview text",
    "Shorten body copy while keeping tone",
    "Strengthen the call to action",
    "Add a more formal sign-off",
  ];
  const out = [...cleaned];
  for (const d of defaults) {
    if (out.length >= 2) break;
    if (!out.includes(d)) out.push(d);
  }
  return out.slice(0, 4);
}

function normalizeEmailAssistantResult(raw: z.infer<typeof emailAssistantSchema>): AIEmailAssistantResult {
  let subject = clampSubject(raw.subject, 78);
  if (looksLikeInstructionEcho(subject)) {
    subject = clampSubject("New career opportunity", 78);
  }
  let previewText = raw.previewText.trim().slice(0, 160);
  if (looksLikeInstructionEcho(previewText)) {
    previewText = "";
  }
  const headline = sanitizeEchoingLine(raw.headline, subject, 200);
  const subhead = sanitizeEchoingLine(raw.subhead, subject, 200);
  let bodyHtml = raw.body_html_fragment.trim().slice(0, 50000);
  if (raw.delivery_mode === "visual_blocks" && bodyHtml) {
    bodyHtml = sanitizeBodyHtmlHeadings(bodyHtml, headline || subject);
  }
  let message = raw.message.trim().slice(0, 12000);
  if (raw.delivery_mode === "classic_fields") {
    message = fixDuplicateRoleInClassicMessage(message);
  }
  return {
    subject,
    previewText,
    delivery_mode: raw.delivery_mode,
    body_html_fragment: bodyHtml,
    html_body_full: raw.html_body_full.trim().slice(0, 200000),
    headline,
    subhead,
    message,
    buttonLabel: raw.buttonLabel.trim().slice(0, 80),
    buttonUrl: sanitizeButtonUrl(raw.buttonUrl),
    signOff: raw.signOff.trim().slice(0, 500),
    suggested_followups: clampSuggestedFollowups(raw.suggested_followups),
  };
}

function trimConversation(messages: ChatMsg[], maxMessages = 18): ChatMsg[] {
  const slice = messages.slice(-maxMessages);
  let total = 0;
  const maxChars = 12000;
  const out: ChatMsg[] = [];
  for (let i = slice.length - 1; i >= 0; i--) {
    const c = slice[i].content.length;
    if (total + c > maxChars && out.length > 0) break;
    total += c;
    out.unshift(slice[i]);
  }
  return out;
}

async function generateEmailAssistantViaOpenAI(params: {
  messages: ChatMsg[];
  companyName: string;
  editorContext?: string | null;
}): Promise<AIEmailAssistantResult> {
  const convo = trimConversation(params.messages);
  const userBlock = convo
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const ctx = params.editorContext?.trim()
    ? `\n\nCURRENT EMAIL CONTEXT (edit or replace as instructed):\n${params.editorContext.slice(0, 12000)}`
    : "";

  // Chat: keep temperature low so structured fields stay stable and copy less often echoes raw instructions.
  const content = await openaiStructuredCompletion({
    temperature: 0.18,
    jsonSchemaName: "clarity_email_assistant",
    jsonSchema: { ...EMAIL_ASSISTANT_JSON_SCHEMA },
    messages: [
      { role: "system", content: CAMPAIGN_SYSTEM },
      {
        role: "user",
        content: `Company / brand name: ${params.companyName.trim() || "Your Company"}${ctx}

Conversation:
${userBlock}

Return one JSON object matching the schema. In every string field (subject, previewText, headline, subhead, message, signOff, HTML bodies): use polished, professional formal-marketing copy unless the user explicitly asks for a different tone.

Never put the user's instruction wording into headline, subject, or headings — only the resulting marketing copy for candidates.

Fill suggested_followups with 2–4 contextual next prompts for the chat UI (see system instructions).

Choose delivery_mode thoughtfully: default to classic_fields for a simple letter or one-off note; use visual_blocks only when multiple sections or rich structure is needed; raw_html only when the user asks for full HTML or complex layout. Avoid unnecessary h1 banner headings.`,
      },
    ],
  });

  const parsed: unknown = JSON.parse(content);
  const checked = emailAssistantSchema.safeParse(parsed);
  if (!checked.success) {
    throw new Error(`Invalid email assistant shape: ${checked.error.message}`);
  }
  return normalizeEmailAssistantResult(checked.data);
}

async function generateSubjectSuggestionsViaOpenAI(prompt: string): Promise<string[]> {
  const draft = prompt.trim();
  const content = await openaiStructuredCompletion({
    temperature: 0.35,
    jsonSchemaName: "clarity_subject_suggestions",
    jsonSchema: { ...SUBJECT_SUGGESTIONS_JSON_SCHEMA },
    messages: [
      { role: "system", content: SUBJECT_SYSTEM },
      {
        role: "user",
        content: draft
          ? `Context for subject lines (recruiting email):\n${draft}`
          : "Suggest four recruiting email subject lines for outreach to a qualified candidate about an open role.",
      },
    ],
  });

  const parsed: unknown = JSON.parse(content);
  const checked = suggestionsSchema.safeParse(parsed);
  if (!checked.success) {
    throw new Error("Invalid suggestions shape from OpenAI");
  }
  return checked.data.suggestions.map((s) => clampSubject(s, 78)).slice(0, 4);
}

// —— Fallbacks (no OpenAI) ——

async function generateCampaignFormFieldsFallback(params: {
  goal: string;
  jobTitle: string;
  tone: "Professional" | "Friendly" | "Casual" | "Urgent";
  length: "Short" | "Medium" | "Detailed";
  companyName: string;
}): Promise<AIEmailAssistantResult> {
  await new Promise((r) => setTimeout(r, 50));
  const co = params.companyName.trim() || "Our team";
  const jtRaw = params.jobTitle.trim() || "{{job_title}}";
  const jt = jtRaw.startsWith("{{") ? jtRaw : normalizeJobTitleForTemplates(jtRaw);
  const { tone, length: len } = params;
  const open = openingLineForFallback(tone, jtRaw, co);
  const mid =
    len === "Detailed"
      ? `${open}\n\nWe think your background could be a strong match. We'd love to share more about the team, scope, and what success looks like in the first 90 days.\n\nIf you're open to it, the next step is simple: review the role and apply when you're ready.`
      : len === "Medium"
        ? `${open}\n\nWe'd love to tell you more about the role and team — take a look and let us know if you'd like to connect.`
        : `${open} Take a look and apply if it feels like a fit.`;
  const subj = params.goal.includes("interview")
    ? `Interview details — ${jt}`
    : params.goal.includes("event")
      ? `You're invited — ${co}`
      : params.goal.includes("Referral")
        ? `${co} is hiring — know someone great?`
        : `New opportunity: ${jt} at ${co}`;
  return {
    subject: clampSubject(subj, 78),
    previewText: len === "Short" ? clampSubject(`${jt} at ${co}`, 160) : clampSubject(`${jt} · ${co} · ${params.goal.slice(0, 40)}`, 160),
    delivery_mode: "classic_fields",
    body_html_fragment: "",
    html_body_full: "",
    headline: jtRaw.startsWith("{{") ? jtRaw : fallbackHeadlineFromJobTitle(jtRaw, co),
    subhead: `${co} · Talent`,
    message: fixDuplicateRoleInClassicMessage(mid),
    buttonLabel: params.goal.includes("event") ? "RSVP" : "View Role & Apply",
    buttonUrl: "{{jobUrl}}",
    signOff: `Best,\n${co} Recruiting`,
    suggested_followups: [
      "Tighten subject line and preview text for clarity",
      "Shorten the body while keeping a formal tone",
      "Strengthen the primary call to action",
      "Add a brief PS with next steps",
    ],
  };
}

async function generateFromConversationFallback(params: {
  messages: ChatMsg[];
  companyName: string;
}): Promise<AIEmailAssistantResult> {
  await new Promise((r) => setTimeout(r, 50));
  const lastUser = [...params.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  const lower = lastUser.toLowerCase();
  let goal = "Source passive candidates";
  if (lower.includes("interview") || lower.includes("confirm")) goal = "Confirm interview";
  else if (lower.includes("event") || lower.includes("invite")) goal = "Invite to event";
  else if (lower.includes("refer")) goal = "Referral ask";
  else if (lower.includes("re-engage") || lower.includes("reconnect")) goal = "Re-engage past applicants";

  let tone: "Professional" | "Friendly" | "Casual" | "Urgent" = "Friendly";
  if (lower.includes("professional") || lower.includes("formal")) tone = "Professional";
  if (lower.includes("casual")) tone = "Casual";
  if (lower.includes("urgent") || lower.includes("asap")) tone = "Urgent";

  let length: "Short" | "Medium" | "Detailed" = "Short";
  if (lower.includes("detailed") || lower.includes("longer")) length = "Detailed";
  else if (lower.includes("medium")) length = "Medium";

  const jobGuess = extractJobTitleGuessFromUserMessage(lastUser);

  return generateCampaignFormFieldsFallback({
    goal,
    jobTitle: jobGuess,
    tone,
    length,
    companyName: params.companyName,
  });
}

function stubSubjectSuggestions(prompt: string): string[] {
  const p = prompt.slice(0, 30) || "Your Application";
  return [
    "Exciting Opportunity: Join Our Growing Team",
    `Re: ${p}`,
    "We Have a Role Perfect for You",
    "New Position Alert — Apply Now",
  ];
}

function serializeEditorContext(body: Record<string, unknown>): string | null {
  const raw = body.editorContext;
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lines: string[] = [];
  if (typeof o.composeKind === "string") lines.push(`Mode: ${o.composeKind}`);
  if (typeof o.useBlocks === "boolean") lines.push(`Visual blocks: ${o.useBlocks}`);
  if (typeof o.subject === "string") lines.push(`Current subject: ${o.subject}`);
  if (typeof o.previewText === "string") lines.push(`Preview text: ${o.previewText}`);
  if (typeof o.bodySummary === "string" && o.bodySummary.trim()) {
    lines.push(`Body / blocks summary:\n${o.bodySummary.slice(0, 12000)}`);
  }
  if (typeof o.htmlExcerpt === "string" && o.htmlExcerpt.trim()) {
    lines.push(`HTML excerpt (Code mode):\n${o.htmlExcerpt.slice(0, 12000)}`);
  }
  return lines.length ? lines.join("\n") : null;
}

async function logUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  mode: string,
): Promise<void> {
  const { error } = await supabase.from("email_ai_usage").insert({ user_id: userId, mode });
  if (error && !/relation .* does not exist/i.test(error.message)) {
    console.warn("email_ai_usage insert:", error.message);
  }
}

async function getAuthedUserId(
  req: Request,
): Promise<{ userId: string; supabaseAdmin: ReturnType<typeof createClient> } | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return {
      error: new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  return { userId: user.id, supabaseAdmin };
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

  const auth = await getAuthedUserId(req);
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "usage") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

    try {
      const { count, error } = await auth.supabaseAdmin
        .from("email_ai_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", auth.userId)
        .gte("created_at", startOfMonth);

      if (error) {
        return new Response(
          JSON.stringify({
            requestsThisMonth: 0,
            monthLabel,
            note: "Usage tracking unavailable until migration is applied.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          requestsThisMonth: count ?? 0,
          monthLabel,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch {
      return new Response(
        JSON.stringify({ requestsThisMonth: 0, monthLabel, note: "Usage unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  const mode = body.mode as string | undefined;
  if (mode === "subject_suggestions") {
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    let suggestions: string[] = [];
    if (isOpenAIConfigured()) {
      try {
        suggestions = await generateSubjectSuggestionsViaOpenAI(prompt);
      } catch (err) {
        console.error("email-ai subject_suggestions:", err);
        suggestions = stubSubjectSuggestions(prompt);
      }
    } else {
      suggestions = stubSubjectSuggestions(prompt);
    }
    await logUsage(auth.supabaseAdmin, auth.userId, "subject_suggestions");
    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (mode === "chat") {
    const companyName = typeof body.companyName === "string" ? body.companyName : "Your Company";
    const rawMessages = body.messages;
    if (!Array.isArray(rawMessages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = rawMessages.map((m: { role?: string; content?: string }) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : "",
    }));

    const editorContext = serializeEditorContext(body);

    let fields: AIEmailAssistantResult;
    if (isOpenAIConfigured()) {
      try {
        fields = await generateEmailAssistantViaOpenAI({ messages, companyName, editorContext });
      } catch (err) {
        console.error("email-ai chat:", err);
        fields = await generateFromConversationFallback({ messages, companyName });
      }
    } else {
      fields = await generateFromConversationFallback({ messages, companyName });
    }
    await logUsage(auth.supabaseAdmin, auth.userId, "chat");
    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "Unsupported request. Use mode subject_suggestions, mode chat, or action usage." }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
