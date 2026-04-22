import { useState, useRef, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { emailAiRequest, type EmailAIEditorContext } from '@/lib/email/email-ai-api-client';
import type { AIEmailAssistantResult } from '@/lib/email/email-ai-adapter';
import { cn } from '@/lib/utils';
import { Brain, Send, PanelRight, MessageSquarePlus, Undo2, User, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** State captured before each AI turn — used to restore chat + email draft on Undo. */
export type AiEmailUndoSnapshot = {
  messages: ChatMessage[];
  input: string;
  includeContext: boolean;
  llmSuggestions: string[];
  subject: string;
  composeKind: ComposeKind;
  htmlBody: string;
  formPayload: AnnouncementForm;
};

const INTRO =
  "I'm your recruiting email assistant — I help you write polished candidate outreach in a professional, employer-brand tone.\n\n" +
  'Describe the email you want (new or a revision). I can work in the visual editor (sections or fields) or the HTML editor. Turn on “Include current email” below when you want changes that match what is already in your draft.';

export function createDefaultEmailAIMessages(): ChatMessage[] {
  return [{ id: 'intro', role: 'assistant', content: INTRO }];
}

function getContextualStarters(editorContext: EmailAIEditorContext | null): { label: string; prompt: string }[] {
  const hasDraft = Boolean(
    editorContext?.subject?.trim() ||
      editorContext?.bodySummary?.trim() ||
      editorContext?.htmlExcerpt?.trim(),
  );
  if (hasDraft) {
    return [
      {
        label: 'Polish this draft',
        prompt:
          'Rewrite my current draft in a more formal, polished marketing tone while preserving structure and merge tags.',
      },
      {
        label: 'Subject & preview',
        prompt: 'Refine only the subject line and preview text for clarity and credibility; keep body unchanged unless needed for alignment.',
      },
      {
        label: 'Stronger CTA',
        prompt: 'Strengthen the primary call to action and button label; keep tone formal and single primary ask.',
      },
      {
        label: 'Tighten length',
        prompt: 'Tighten and shorten the body copy while keeping a formal business register and clear hierarchy.',
      },
      {
        label: 'Add a section',
        prompt:
          'Add one additional professional section (e.g. team, impact, or process) with a smooth transition from existing copy.',
      },
    ];
  }
  return [
    {
      label: 'Role announcement',
      prompt:
        'Draft a formal multi-section role announcement: headline, value proposition, key qualifications, and one primary CTA.',
    },
    {
      label: 'Interview invitation',
      prompt:
        'Write a professional interview invitation with role title, date, time, format, and preparation notes.',
    },
    {
      label: 'Executive nurture',
      prompt:
        'Create an executive-style nurture email: employer positioning, role relevance, and a discreet next step.',
    },
    {
      label: 'Referral ask',
      prompt:
        'Draft a referral-focused email: respectful ask, why the role matters, and a low-pressure next step.',
    },
  ];
}

const FALLBACK_LLM_CHIPS = [
  'Tighten subject line and preview text',
  'Shorten body copy while keeping tone',
  'Strengthen the primary call to action',
] as const;

function buildAssistantSummary(f: AIEmailAssistantResult): string {
  const subj = f.subject?.trim();
  const hasPreheader = Boolean(f.previewText?.trim());
  const subjLine =
    subj && subj.length > 0
      ? `I updated the subject${hasPreheader ? ' and preheader' : ''}${subj.length > 56 ? ` (“${subj.slice(0, 56)}…”)` : ` (“${subj}”)`}.`
      : 'I refreshed the draft in the editor.';

  let bodyHint = '';
  if (f.delivery_mode === 'raw_html') {
    bodyHint =
      'The body is in the HTML editor — check the live preview on the right, then tell me what to tighten.';
  } else if (f.delivery_mode === 'visual_blocks') {
    bodyHint =
      'The body is in the visual editor as sections you can reorder — say if you want a different structure or tone.';
  } else {
    bodyHint =
      'The body is shown as structured fields for a quick edit — you can switch to sections in the editor anytime.';
  }

  return `${subjLine}\n\n${bodyHint}\n\nWhat should we refine next?`;
}

interface EmailAIChatPanelProps {
  companyName: string;
  editorContext: EmailAIEditorContext | null;
  /** Returns whether draft state was applied (merge validation passed). */
  onApply: (result: AIEmailAssistantResult) => boolean;
  onOpenEditor?: () => void;
  className?: string;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: (v: string) => void;
  includeContext: boolean;
  setIncludeContext: (v: boolean) => void;
  llmSuggestions: string[];
  setLlmSuggestions: Dispatch<SetStateAction<string[]>>;
  onNewConversation: () => void;
  captureUndoSnapshot: () => AiEmailUndoSnapshot;
  onRegisterUndo: (snapshot: AiEmailUndoSnapshot) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export function EmailAIChatPanel({
  companyName,
  editorContext,
  onApply,
  onOpenEditor,
  className,
  messages,
  setMessages,
  input,
  setInput,
  includeContext,
  setIncludeContext,
  llmSuggestions,
  setLlmSuggestions,
  onNewConversation,
  captureUndoSnapshot,
  onRegisterUndo,
  onUndo,
  canUndo,
}: EmailAIChatPanelProps) {
  const [busy, setBusy] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const starterChips = useMemo(() => getContextualStarters(editorContext), [editorContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const runSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const undoSnapshot = captureUndoSnapshot();
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await emailAiRequest({
        mode: 'chat',
        messages: history,
        companyName,
        editorContext: includeContext && editorContext ? editorContext : null,
      });
      if (!('fields' in res)) {
        throw new Error('Invalid AI response');
      }
      const f = res.fields;
      const followups = f.suggested_followups?.length
        ? f.suggested_followups
        : [...FALLBACK_LLM_CHIPS];
      const applied = onApply(f);
      if (!applied) {
        setMessages((prev) => {
          const next = [...prev];
          if (next.length && next[next.length - 1]?.role === 'user') next.pop();
          return next;
        });
        setInput(trimmed);
        return;
      }
      setLlmSuggestions(followups);
      const summary = buildAssistantSummary(f);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: summary }]);
      onRegisterUndo(undoSnapshot);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI request failed');
      setMessages((prev) => {
        const next = [...prev];
        if (next.length && next[next.length - 1]?.role === 'user') next.pop();
        return next;
      });
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  };

  const hasUserTurn = messages.some((m) => m.role === 'user');

  const followUpChips =
    llmSuggestions.length >= 2 ? llmSuggestions : [...FALLBACK_LLM_CHIPS];

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-muted/5 shadow-sm overflow-hidden flex flex-col min-h-0 h-full',
        className,
      )}
    >
      <div className="px-3 sm:px-4 py-2.5 border-b border-border bg-gradient-to-b from-muted/40 to-muted/10 shrink-0">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-sky-blue/10 ring-1 ring-sky-blue/25">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-sky-blue" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-tight">Email assistant</h3>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                New chat clears this conversation. Undo restores your previous draft.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 text-[11px] gap-1 px-2.5 sm:px-3"
              onClick={onNewConversation}
              disabled={busy}
              title="Start a new conversation"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              New chat
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px] gap-1 px-2.5 sm:px-3"
              onClick={onUndo}
              disabled={busy || !canUndo}
              title="Undo the last assistant reply and restore your draft"
            >
              <Undo2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Undo
            </Button>
            {onOpenEditor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1 px-2.5 sm:px-3"
                onClick={onOpenEditor}
                title="Open the editor tab"
              >
                <PanelRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Editor
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 py-2.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-background/80 shrink-0">
        <div className="flex items-center gap-2">
          <Switch
            id="ai-include-context"
            checked={includeContext}
            onCheckedChange={setIncludeContext}
            disabled={busy || !editorContext}
          />
          <Label htmlFor="ai-include-context" className="text-xs font-normal cursor-pointer leading-snug">
            Include current email
            <span className="block text-[10px] text-muted-foreground font-normal">
              {editorContext
                ? 'Sends subject, preheader, and body summary so edits match your draft.'
                : 'Save or load a draft first to attach context.'}
            </span>
          </Label>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-3 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/20 via-transparent to-transparent">
        <div className="space-y-4 max-w-[min(100%,40rem)] mx-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-2 items-end', m.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start')}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 rounded-full items-center justify-center border text-[10px] font-medium',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-sky-blue/10 border-sky-blue/25 text-sky-blue',
                )}
                aria-hidden
              >
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4 shrink-0" />}
              </div>
              <div
                className={cn(
                  'min-w-0 max-w-[min(100%,26rem)] rounded-2xl px-3.5 py-3 text-sm shadow-sm',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card text-foreground border border-border/80 rounded-bl-md',
                )}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide opacity-70 mb-1">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.content}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2 items-end justify-start">
              <div className="flex h-8 w-8 shrink-0 rounded-full items-center justify-center border border-sky-blue/25 bg-sky-blue/10 text-sky-blue">
                <Brain className="h-4 w-4 shrink-0 animate-pulse" aria-hidden />
              </div>
              <div className="rounded-2xl rounded-bl-md border border-border/80 bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
                Drafting your email…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/** Composer first so users see typing as primary; chips are optional shortcuts */}
      <div className="p-3 border-t border-border bg-card space-y-2 shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="ai-chat-message" className="text-xs font-medium text-foreground">
            Your message
          </Label>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Type your own prompt — or expand Suggestions for shortcuts
          </span>
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            id="ai-chat-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasUserTurn
                ? 'Ask for changes in your own words…'
                : 'Describe the email you want — e.g. “shorter intro for a senior engineer role”…'
            }
            rows={3}
            className="resize-none text-sm min-h-[88px] bg-background border-border/80 focus-visible:ring-primary/30"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void runSend(input);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            disabled={busy || !input.trim()}
            onClick={() => void runSend(input)}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
      </div>

      {!busy ? (
        <Collapsible
          open={suggestionsOpen}
          onOpenChange={setSuggestionsOpen}
          className="shrink-0 border-t border-border/60 bg-muted/15"
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
            <span className="text-xs font-medium text-foreground">Suggestions</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                suggestionsOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-2.5 pt-0 space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                {hasUserTurn ? 'Follow-ups from the model — tap to send.' : 'Starters based on your draft — tap to send.'}
              </p>
              <div
                className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin"
                role="list"
                aria-label={hasUserTurn ? 'Model suggested follow-ups' : 'Context-aware starters'}
              >
                {hasUserTurn
                  ? followUpChips.map((text, i) => (
                      <Button
                        key={`llm-${i}-${text.slice(0, 32)}`}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto shrink-0 max-w-[min(100%,220px)] whitespace-normal text-left text-[10px] leading-snug font-normal py-1 px-2 rounded-full border border-border/60 shadow-none"
                        onClick={() => void runSend(text)}
                      >
                        {text}
                      </Button>
                    ))
                  : starterChips.map((c) => (
                      <Button
                        key={c.label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto shrink-0 max-w-[min(100%,200px)] whitespace-normal text-left text-[10px] leading-snug font-normal py-1 px-2 rounded-full border border-border/60 shadow-none"
                        onClick={() => void runSend(c.prompt)}
                      >
                        {c.label}
                      </Button>
                    ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
