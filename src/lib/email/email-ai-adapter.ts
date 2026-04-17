/** AI adapter — provider-agnostic interface for email drafting (parity with mailmerge-magic adapters/ai). */

export interface AIDraftResult {
  subject?: string;
  html?: string;
  suggestions?: string[];
}

export interface AIAdapter {
  name: string;
  generateDraft(params: {
    mode: 'subject_suggestions' | 'full_template' | 'chat';
    prompt: string;
    context?: Record<string, unknown>;
    history?: Array<{ role: string; content: string }>;
  }): Promise<AIDraftResult>;
}

export const openaiAdapter: AIAdapter = {
  name: 'openai',
  async generateDraft({ mode, prompt }) {
    await new Promise(r => setTimeout(r, 800));
    if (mode === 'subject_suggestions') {
      return {
        suggestions: [
          'Exciting Opportunity: Join Our Growing Team',
          `Re: ${prompt.slice(0, 30) || 'Your Application'}`,
          'We Have a Role Perfect for You',
          'New Position Alert — Apply Now',
        ],
      };
    }
    if (mode === 'full_template') {
      return {
        subject: 'Your Next Career Move Starts Here',
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>@media(max-width:600px){.c{width:100%!important;padding:16px!important}}</style></head><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table class="c" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px"><tr><td style="font-size:24px;font-weight:700;color:#18181b;padding-bottom:16px">Your Next Career Move</td></tr><tr><td style="font-size:14px;color:#3f3f46;line-height:1.6;padding-bottom:24px">${prompt || 'We have an exciting opportunity that matches your skills and experience. Click below to learn more and apply.'}</td></tr><tr><td><a href="{{apply_url}}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Apply Now</a></td></tr></table></td></tr></table></body></html>`,
      };
    }
    return {
      html: `<div style="font-family:Arial,sans-serif;padding:20px;"><h2 style="color:#18181b;">AI Generated Content</h2><p style="color:#3f3f46;">${prompt}</p></div>`,
    };
  },
};

export const claudeAdapter: AIAdapter = {
  name: 'claude',
  async generateDraft(params) {
    return openaiAdapter.generateDraft(params);
  },
};

export const geminiAdapter: AIAdapter = {
  name: 'gemini',
  async generateDraft(params) {
    return openaiAdapter.generateDraft(params);
  },
};

export function getAIAdapter(provider?: string): AIAdapter {
  switch (provider) {
    case 'claude':
      return claudeAdapter;
    case 'gemini':
      return geminiAdapter;
    default:
      return openaiAdapter;
  }
}

export type AICampaignTone = 'Professional' | 'Friendly' | 'Casual' | 'Urgent';
export type AICampaignLength = 'Short' | 'Medium' | 'Detailed';

function roleLikePhrase(s: string): boolean {
  return /\b(role|roles|position|positions|opening|openings|opportunity|opportunities)\b/i.test(s);
}

function normalizeJobTitleForTemplates(raw: string): string {
  let t = raw.trim().replace(/^\s*(a|an|the)\s+/i, '');
  if (!t) return 'this opportunity';
  if (t.length > 72) {
    const cut = t.slice(0, 69).trim();
    const sp = cut.lastIndexOf(' ');
    t = sp > 36 ? `${cut.slice(0, sp)}…` : `${cut}…`;
  }
  return t;
}

function openingLineForFallback(tone: AICampaignTone, jobTitle: string, company: string): string {
  const j = normalizeJobTitleForTemplates(jobTitle);
  const co = company;
  const hasRoleWord = roleLikePhrase(j);
  if (tone === 'Casual') {
    return hasRoleWord
      ? `Hey there — quick note about ${j} at ${co}.`
      : `Hey there — quick note about a ${j} opportunity at ${co}.`;
  }
  if (tone === 'Urgent') {
    return `Time-sensitive: we're actively hiring for ${j} at ${co}.`;
  }
  if (tone === 'Friendly') {
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
  if (j.length <= 46 && !j.endsWith('…')) return j;
  const cut = j.slice(0, 44).trim();
  const sp = cut.lastIndexOf(' ');
  if (sp > 24) return `${cut.slice(0, sp)}…`;
  return `Opportunity at ${company}`;
}

function fixDuplicateRoleInClassicMessage(s: string): string {
  return s
    .replace(/\bexciting\s+([\s\S]+?)\s+role\s+at\b/gi, (full, inner: string) => {
      const t = inner.replace(/\s+/g, ' ').trim();
      if (/\brole\b/i.test(t)) return `exciting ${t} at`;
      return full;
    })
    .replace(/\bregarding\s+the\s+([\s\S]+?)\s+position\s+at\b/gi, (full, inner: string) => {
      const t = inner.replace(/\s+/g, ' ').trim();
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
  return '';
}

export interface AICampaignFormFields {
  subject: string;
  previewText: string;
  headline: string;
  subhead: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
  signOff: string;
}

/** How the assistant materializes the email in the editor. */
export type AIEmailDeliveryMode = 'visual_blocks' | 'classic_fields' | 'raw_html';

/**
 * Full assistant output: subject/preheader plus either block HTML, classic fields, or full HTML.
 * `classic_*` fields are always present for schema strictness; use `delivery_mode` to choose what to apply.
 */
export interface AIEmailAssistantResult extends AICampaignFormFields {
  delivery_mode: AIEmailDeliveryMode;
  /** For `visual_blocks`: body-only HTML (h1–h3, p, a with button-like styles, img, hr). Parsed into blocks. */
  body_html_fragment: string;
  /** For `raw_html`: full document for Code mode. Scripts stripped client-side. */
  html_body_full: string;
  /** 2–4 short, actionable next prompts for the chat UI (from the model after each reply). */
  suggested_followups: string[];
}

export async function generateCampaignFormFields(params: {
  goal: string;
  jobTitle: string;
  tone: AICampaignTone;
  length: AICampaignLength;
  companyName: string;
}): Promise<AICampaignFormFields> {
  await new Promise(r => setTimeout(r, 500));
  const co = params.companyName.trim() || 'Our team';
  const jtRaw = params.jobTitle.trim() || '{{job_title}}';
  const jt = jtRaw.startsWith('{{') ? jtRaw : normalizeJobTitleForTemplates(jtRaw);
  const tone = params.tone;
  const len = params.length;
  const open = openingLineForFallback(tone, jtRaw, co);
  const mid =
    len === 'Detailed'
      ? `${open}\n\nWe think your background could be a strong match. We'd love to share more about the team, scope, and what success looks like in the first 90 days.\n\nIf you're open to it, the next step is simple: review the role and apply when you're ready.`
      : len === 'Medium'
        ? `${open}\n\nWe'd love to tell you more about the role and team — take a look and let us know if you'd like to connect.`
        : `${open} Take a look and apply if it feels like a fit.`;
  const subj =
    params.goal.includes('interview')
      ? `Interview details — ${jt}`
      : params.goal.includes('event')
        ? `You're invited — ${co}`
        : params.goal.includes('Referral')
          ? `${co} is hiring — know someone great?`
          : `New opportunity: ${jt} at ${co}`;
  return {
    subject: subj.slice(0, 78),
    previewText: len === 'Short' ? `${jt} at ${co}`.slice(0, 160) : `${jt} · ${co} · ${params.goal.slice(0, 40)}`.slice(0, 160),
    headline: jtRaw.startsWith('{{') ? jtRaw : fallbackHeadlineFromJobTitle(jtRaw, co),
    subhead: `${co} · Talent`,
    message: fixDuplicateRoleInClassicMessage(mid),
    buttonLabel: params.goal.includes('event') ? 'RSVP' : 'View Role & Apply',
    buttonUrl: '{{jobUrl}}',
    signOff: `Best,\n${co} Recruiting`,
  };
}

/** Heuristic template when OpenAI is unavailable or fails. */
export async function generateFromConversationFallback(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  companyName: string;
}): Promise<AICampaignFormFields> {
  await new Promise(r => setTimeout(r, 650));
  const lastUser = [...params.messages].reverse().find(m => m.role === 'user')?.content?.trim() ?? '';
  const lower = lastUser.toLowerCase();
  let goal = 'Source passive candidates';
  if (lower.includes('interview') || lower.includes('confirm')) goal = 'Confirm interview';
  else if (lower.includes('event') || lower.includes('invite')) goal = 'Invite to event';
  else if (lower.includes('refer')) goal = 'Referral ask';
  else if (lower.includes('re-engage') || lower.includes('reconnect')) goal = 'Re-engage past applicants';

  let tone: AICampaignTone = 'Friendly';
  if (lower.includes('professional') || lower.includes('formal')) tone = 'Professional';
  if (lower.includes('casual')) tone = 'Casual';
  if (lower.includes('urgent') || lower.includes('asap')) tone = 'Urgent';

  let length: AICampaignLength = 'Short';
  if (lower.includes('detailed') || lower.includes('longer')) length = 'Detailed';
  else if (lower.includes('medium')) length = 'Medium';

  const jobGuess = extractJobTitleGuessFromUserMessage(lastUser);

  return generateCampaignFormFields({
    goal,
    jobTitle: jobGuess,
    tone,
    length,
    companyName: params.companyName,
  });
}

/** @deprecated Use generateFromConversationFallback — kept for any external imports. */
export const generateFromConversation = generateFromConversationFallback;

export function quickEditMessageBody(message: string, mode: 'shorter' | 'personal' | 'urgency'): string {
  const t = message.trim();
  if (!t) return message;
  if (mode === 'shorter') {
    const first = t.split(/\n\n/)[0] || t;
    return first.length > 120 ? `${first.slice(0, 117)}…` : first;
  }
  if (mode === 'personal') {
    return `Hi {{firstName}},\n\n${t}`;
  }
  return `Quick note — we'd love a response this week if you're interested.\n\n${t}`;
}
