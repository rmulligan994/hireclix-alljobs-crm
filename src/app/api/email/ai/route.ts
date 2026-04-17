import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Database } from '@/integrations/supabase/types';
import { generateFromConversation, openaiAdapter } from '@/lib/email/email-ai-adapter';

async function getAuthedUserId(request: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient<Database>> } | { error: NextResponse }> {
  const token =
    request.headers.get('Authorization')?.replace('Bearer ', '') ?? new URL(request.url).searchParams.get('token');
  if (!token) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) };
  }

  const authClient = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }) };
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return { userId: user.id, supabase };
}

async function logUsage(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  mode: string,
): Promise<void> {
  const { error } = await supabase.from('email_ai_usage').insert({ user_id: userId, mode });
  if (error && !/relation .* does not exist/i.test(error.message)) {
    console.warn('email_ai_usage insert:', error.message);
  }
}

export async function POST(request: Request) {
  const auth = await getAuthedUserId(request);
  if ('error' in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const mode = body.mode as string | undefined;
  if (mode === 'subject_suggestions') {
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const r = await openaiAdapter.generateDraft({ mode: 'subject_suggestions', prompt });
    await logUsage(auth.supabase, auth.userId, 'subject_suggestions');
    return NextResponse.json({ suggestions: r.suggestions ?? [] });
  }

  if (mode === 'chat') {
    const companyName = typeof body.companyName === 'string' ? body.companyName : 'Your Company';
    const rawMessages = body.messages;
    if (!Array.isArray(rawMessages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }
    const messages = rawMessages.map((m: { role?: string; content?: string }) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : '',
    }));
    const fields = await generateFromConversation({ messages, companyName });
    await logUsage(auth.supabase, auth.userId, 'chat');
    return NextResponse.json({ fields });
  }

  return NextResponse.json({ error: 'Unsupported mode. Use subject_suggestions or chat.' }, { status: 400 });
}
