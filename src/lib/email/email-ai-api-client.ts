import { supabase } from '@/integrations/supabase/client';
import type { AIEmailAssistantResult } from '@/lib/email/email-ai-adapter';

export type EmailAISubjectResponse = { suggestions: string[] };
export type EmailAIChatResponse = { fields: AIEmailAssistantResult };

/** Optional snapshot of the current email so the model can revise whole layouts, not only classic fields. */
export type EmailAIEditorContext = {
  composeKind: 'announcement_form' | 'raw_html';
  useBlocks: boolean;
  subject: string;
  previewText: string;
  /** Short text summary of blocks or classic body for edits */
  bodySummary: string;
  /** First ~4k chars of HTML when in Code mode */
  htmlExcerpt?: string;
};

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use AI features.');
  }
  return session.access_token;
}

/** Calls Supabase Edge Function `email-ai` (OpenAI + fallbacks). */
export async function emailAiRequest(
  body:
    | { mode: 'subject_suggestions'; prompt: string }
    | {
        mode: 'chat';
        messages: Array<{ role: 'user' | 'assistant' | string; content: string }>;
        companyName: string;
        editorContext?: EmailAIEditorContext | null;
      },
): Promise<EmailAISubjectResponse | EmailAIChatResponse> {
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke('email-ai', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    throw new Error(error.message || 'AI request failed');
  }
  if (data == null) {
    throw new Error('No response from email AI. Check that the email-ai function is deployed.');
  }
  const payload = data as { error?: string } & Record<string, unknown>;
  if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
    throw new Error(payload.error);
  }
  return data as EmailAISubjectResponse | EmailAIChatResponse;
}

export async function fetchEmailAiUsage(): Promise<{ requestsThisMonth: number; monthLabel: string }> {
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke('email-ai', {
    body: { action: 'usage' },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    throw new Error(error.message || 'Usage request failed');
  }
  if (data == null) {
    throw new Error('No response from email AI usage.');
  }
  const payload = data as { error?: string; requestsThisMonth?: number; monthLabel?: string; note?: string };
  if (payload && typeof payload.error === 'string') {
    throw new Error(payload.error);
  }
  return {
    requestsThisMonth: payload.requestsThisMonth ?? 0,
    monthLabel: payload.monthLabel ?? '',
  };
}
