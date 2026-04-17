import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { emailAiRequest } from '@/lib/email/email-ai-api-client';
import type { AICampaignFormFields } from '@/lib/email/email-ai-adapter';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const INTRO =
  "Hi — I'm here to help you draft recruiting email copy. Describe who you're writing to and what you want them to do. I'll fill in the form fields (no raw HTML). You can also use a shortcut below.";

const QUICK_CHIPS = [
  'Interview confirmation for a scheduled call',
  'Referral ask to our network',
  'Re-engage past applicants about new roles',
  'Job announcement for an open requisition',
] as const;

interface EmailAIChatPanelProps {
  companyName: string;
  onApplyFields: (fields: AICampaignFormFields) => void;
  className?: string;
}

export function EmailAIChatPanel({ companyName, onApplyFields, className }: EmailAIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'intro', role: 'assistant', content: INTRO }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const runSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await emailAiRequest({ mode: 'chat', messages: history, companyName });
      if (!('fields' in res)) {
        throw new Error('Invalid AI response');
      }
      const fields = res.fields;
      const summary = `I've drafted a subject line, preview text, headline, body, and button text based on what you said. Switch to the Editor tab to review and edit.`;
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: summary }]);
      onApplyFields(fields);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground p-4 space-y-3 flex flex-col max-h-[min(520px,70vh)]',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        Conversational AI — replies become your email fields (plain text only). Same deterministic assistant behavior as mailmerge-magic.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map(chip => (
          <Button
            key={chip}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto py-1 px-2 text-[11px] font-normal text-left whitespace-normal"
            disabled={busy}
            onClick={() => runSend(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
      <ScrollArea className="flex-1 min-h-[180px] max-h-[280px] rounded-md border bg-muted/20 p-3">
        <div className="space-y-3 pr-2">
          {messages.map(m => (
            <div
              key={m.id}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                m.role === 'user' ? 'bg-primary text-primary-foreground ml-6' : 'bg-muted mr-6',
              )}
            >
              <p className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">{m.role === 'user' ? 'You' : 'Assistant'}</p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {busy && <p className="text-xs text-muted-foreground animate-pulse">Thinking…</p>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Describe the email you need…"
          rows={3}
          className="resize-none text-sm"
          disabled={busy}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void runSend(input);
            }
          }}
        />
        <Button type="button" className="shrink-0" disabled={busy || !input.trim()} onClick={() => void runSend(input)}>
          Send
        </Button>
      </div>
    </div>
  );
}
