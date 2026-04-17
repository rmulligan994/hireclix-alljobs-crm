import { supabase } from '@/integrations/supabase/client';
import type { AICampaignFormFields } from '@/lib/email/email-ai-adapter';

export type EmailAISubjectResponse = { suggestions: string[] };
export type EmailAIChatResponse = { fields: AICampaignFormFields };

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use AI features.');
  }
  return session.access_token;
}

/** Calls `POST /api/email/ai` with the user session. */
export async function emailAiRequest(
  body:
    | { mode: 'subject_suggestions'; prompt: string }
    | {
        mode: 'chat';
        messages: Array<{ role: 'user' | 'assistant' | string; content: string }>;
        companyName: string;
      },
): Promise<EmailAISubjectResponse | EmailAIChatResponse> {
  const token = await getAccessToken();
  const res = await fetch('/api/email/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `AI request failed (${res.status})`);
  }
  return data as EmailAISubjectResponse | EmailAIChatResponse;
}

export async function fetchEmailAiUsage(): Promise<{ requestsThisMonth: number; monthLabel: string }> {
  const token = await getAccessToken();
  const res = await fetch('/api/email/ai/usage', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; requestsThisMonth?: number; monthLabel?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Usage request failed');
  }
  return {
    requestsThisMonth: data.requestsThisMonth ?? 0,
    monthLabel: data.monthLabel ?? '',
  };
}
