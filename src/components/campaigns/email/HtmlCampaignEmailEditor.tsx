'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Tags, X, ChevronDown, ChevronUp, Sparkles, Pencil } from 'lucide-react';
import { EmailPreviewPane } from './EmailPreviewPane';
import { toast } from 'sonner';
import { EmailComposer } from './EmailComposer';
import {
  EmailAIChatPanel,
  createDefaultEmailAIMessages,
  type AiEmailUndoSnapshot,
  type ChatMessage,
} from './EmailAIChatPanel';
import { MergeTagsPanel } from '../MergeTagsPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { emptyAnnouncementForm, payloadToAnnouncementForm, renderAnnouncementToHTML } from '@/lib/email/email-utils';
import type { AIEmailAssistantResult } from '@/lib/email/email-ai-adapter';
import { mergeAIEmailAssistantResult } from '@/lib/email/apply-ai-email-result';
import { buildEmailAIEditorContext } from '@/lib/email/email-ai-editor-context';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';

export type HtmlCampaignEmailSavePayload = {
  html: string;
  subject: string;
  compose_kind: ComposeKind;
  form_payload: AnnouncementForm | null;
};

export interface HtmlCampaignEmailEditorProps {
  initialSubject?: string;
  initialHtmlContent?: string | null;
  initialComposeKind?: ComposeKind | null;
  /** Raw JSON from DB — announcement form fields */
  initialFormPayload?: unknown;
  /** Used in AI assistant + rendered previews (same role as mailmerge-magic brand name). */
  companyName?: string;
  campaignJobId?: string | null;
  /** Scopes AI chat persistence in sessionStorage to this campaign (use `draft` when unset). */
  campaignId?: string | null;
  /** Apply design and continue the flow without writing to the template library. */
  onContinue: (payload: HtmlCampaignEmailSavePayload) => void;
  /** When set, shows a second action that saves to the reusable template library (toast + template step in campaign flow). */
  onSaveToTemplateLibrary?: (payload: HtmlCampaignEmailSavePayload) => void;
  onCancel: () => void;
  /** When the user opened the editor from a saved library template, enables rename in the toolbar. */
  loadedTemplate?: { id: string; name: string } | null;
  onRenameTemplate?: (templateId: string, newName: string) => void;
}

function emailAiChatStorageKey(campaignId: string | null | undefined): string {
  const id = campaignId?.trim() || 'draft';
  return `clarity-email-ai-chat::${id}`;
}

function readStoredEmailAiChat(campaignId: string | null | undefined): {
  messages: ChatMessage[];
  input: string;
  include: boolean;
  llmSuggestions: string[];
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(emailAiChatStorageKey(campaignId));
    if (!raw) return null;
    const o = JSON.parse(raw) as {
      messages?: ChatMessage[];
      input?: string;
      include?: boolean;
      llmSuggestions?: string[];
    };
    if (Array.isArray(o.messages) && o.messages.length > 0) {
      return {
        messages: o.messages,
        input: typeof o.input === 'string' ? o.input : '',
        include: typeof o.include === 'boolean' ? o.include : true,
        llmSuggestions: Array.isArray(o.llmSuggestions)
          ? o.llmSuggestions.filter((s): s is string => typeof s === 'string')
          : [],
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function cloneAnnouncementForm(fp: AnnouncementForm): AnnouncementForm {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(fp);
    } catch {
      /* continue */
    }
  }
  return JSON.parse(JSON.stringify(fp)) as AnnouncementForm;
}

function computeOutgoingHtml(
  composeKind: ComposeKind,
  formPayload: AnnouncementForm,
  htmlBody: string,
  siteName: string,
): string {
  if (composeKind === 'announcement_form') {
    return renderAnnouncementToHTML(formPayload, { siteName });
  }
  return htmlBody;
}

export function HtmlCampaignEmailEditor({
  initialSubject = '',
  initialHtmlContent = '',
  initialComposeKind = 'announcement_form',
  initialFormPayload,
  companyName = 'Your Company',
  campaignJobId,
  campaignId,
  onContinue,
  onSaveToTemplateLibrary,
  onCancel,
  loadedTemplate = null,
  onRenameTemplate,
}: HtmlCampaignEmailEditorProps) {
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<'editor' | 'ai'>('editor');
  const [subject, setSubject] = useState(initialSubject);
  const [composeKind, setComposeKind] = useState<ComposeKind>(
    initialComposeKind === 'raw_html' ? 'raw_html' : 'announcement_form',
  );
  const [htmlBody, setHtmlBody] = useState(initialHtmlContent || '');
  const [formPayload, setFormPayload] = useState<AnnouncementForm>(() =>
    initialFormPayload != null
      ? payloadToAnnouncementForm(initialFormPayload)
      : emptyAnnouncementForm(),
  );
  const [mergePopoverOpen, setMergePopoverOpen] = useState(false);
  /** Start collapsed so the editor surface isn’t buried under a long tip block. */
  const [helpBannerOpen, setHelpBannerOpen] = useState(false);
  const [helpBannerDismissed, setHelpBannerDismissed] = useState(false);

  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(() => createDefaultEmailAIMessages());
  const [aiInput, setAiInput] = useState('');
  const [aiIncludeContext, setAiIncludeContext] = useState(true);
  const [aiLlmSuggestions, setAiLlmSuggestions] = useState<string[]>([]);
  const [aiUndoStack, setAiUndoStack] = useState<AiEmailUndoSnapshot[]>([]);
  const [aiChatPersistReady, setAiChatPersistReady] = useState(false);

  const initialFormKey = useMemo(
    () => (initialFormPayload == null ? 'null' : JSON.stringify(initialFormPayload)),
    [initialFormPayload],
  );

  // Resync local state when the parent changes the template/step seed (object identity may differ while JSON is stable).
  useEffect(() => {
    setSubject(initialSubject);
    setComposeKind(initialComposeKind === 'raw_html' ? 'raw_html' : 'announcement_form');
    setHtmlBody(initialHtmlContent ?? '');
    setFormPayload(
      initialFormPayload != null
        ? payloadToAnnouncementForm(initialFormPayload)
        : emptyAnnouncementForm(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialFormKey tracks form payload content without unstable object identity
  }, [initialSubject, initialHtmlContent, initialComposeKind, initialFormKey]);

  useEffect(() => {
    setAiChatPersistReady(false);
    const s = readStoredEmailAiChat(campaignId);
    if (s) {
      setAiMessages(s.messages);
      setAiInput(s.input);
      setAiIncludeContext(s.include);
      setAiLlmSuggestions(s.llmSuggestions);
    } else {
      setAiMessages(createDefaultEmailAIMessages());
      setAiInput('');
      setAiIncludeContext(true);
      setAiLlmSuggestions([]);
    }
    setAiUndoStack([]);
    setAiChatPersistReady(true);
  }, [campaignId]);

  useEffect(() => {
    if (!aiChatPersistReady) return;
    try {
      sessionStorage.setItem(
        emailAiChatStorageKey(campaignId),
        JSON.stringify({
          messages: aiMessages,
          input: aiInput,
          include: aiIncludeContext,
          llmSuggestions: aiLlmSuggestions,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [aiChatPersistReady, campaignId, aiMessages, aiInput, aiIncludeContext, aiLlmSuggestions]);

  const resetAiChat = useCallback(() => {
    setAiMessages(createDefaultEmailAIMessages());
    setAiInput('');
    setAiIncludeContext(true);
    setAiLlmSuggestions([]);
    setAiUndoStack([]);
    try {
      sessionStorage.removeItem(emailAiChatStorageKey(campaignId));
    } catch {
      /* ignore */
    }
  }, [campaignId]);

  const captureAiUndoSnapshot = useCallback((): AiEmailUndoSnapshot => {
    return {
      messages: aiMessages.map((m) => ({ ...m })),
      input: aiInput,
      includeContext: aiIncludeContext,
      llmSuggestions: [...aiLlmSuggestions],
      subject,
      composeKind,
      htmlBody,
      formPayload: cloneAnnouncementForm(formPayload),
    };
  }, [aiMessages, aiInput, aiIncludeContext, aiLlmSuggestions, subject, composeKind, htmlBody, formPayload]);

  const registerAiUndo = useCallback((snapshot: AiEmailUndoSnapshot) => {
    setAiUndoStack((prev) => [...prev, snapshot]);
  }, []);

  const undoLastAiTurn = useCallback(() => {
    setAiUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snap = prev[prev.length - 1];
      setAiMessages(snap.messages);
      setAiInput(snap.input);
      setAiIncludeContext(snap.includeContext);
      setAiLlmSuggestions(snap.llmSuggestions);
      setSubject(snap.subject);
      setComposeKind(snap.composeKind);
      setHtmlBody(snap.htmlBody);
      setFormPayload(snap.formPayload);
      toast.success('Undid last reply — your draft and chat were restored.');
      return prev.slice(0, -1);
    });
  }, []);

  const buildPayload = useCallback((): HtmlCampaignEmailSavePayload => {
    const html = computeOutgoingHtml(composeKind, formPayload, htmlBody, companyName);
    return {
      html,
      subject,
      compose_kind: composeKind,
      form_payload: composeKind === 'announcement_form' ? formPayload : null,
    };
  }, [companyName, composeKind, formPayload, htmlBody, subject]);

  const handleContinue = useCallback(() => {
    onContinue(buildPayload());
  }, [buildPayload, onContinue]);

  const handleSaveTemplate = useCallback(() => {
    onSaveToTemplateLibrary?.(buildPayload());
  }, [buildPayload, onSaveToTemplateLibrary]);

  const openRenameDialog = useCallback(() => {
    if (!loadedTemplate) return;
    setRenameDraft(loadedTemplate.name);
    setRenameOpen(true);
  }, [loadedTemplate]);

  const submitRename = useCallback(() => {
    const trimmed = renameDraft.trim();
    if (!trimmed || !loadedTemplate || !onRenameTemplate) return;
    onRenameTemplate(loadedTemplate.id, trimmed);
    setRenameOpen(false);
  }, [loadedTemplate, onRenameTemplate, renameDraft]);

  const editorContextForAi = useMemo(
    () => buildEmailAIEditorContext(composeKind, formPayload, subject, htmlBody),
    [composeKind, formPayload, subject, htmlBody],
  );

  const applyAIEmailResult = useCallback((result: AIEmailAssistantResult) => {
    const next = mergeAIEmailAssistantResult(result);
    setSubject(next.subject);
    setComposeKind(next.composeKind);
    setHtmlBody(next.htmlBody);
    setFormPayload(next.formPayload);
    toast.success('Draft updated — preview on the right. Keep chatting here or open Editor to tweak manually.');
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
            <DialogDescription>
              This updates the name in your template library. Campaign name is separate.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitRename();
              }
            }}
            placeholder="Template name"
            className="mt-1"
            autoFocus
            aria-label="Template name"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-primary hover:opacity-90"
              onClick={submitRename}
              disabled={!renameDraft.trim()}
            >
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 min-w-0 order-1 sm:order-none flex-wrap">
          <Button variant="ghost" size="sm" onClick={onCancel} type="button">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {loadedTemplate && onRenameTemplate ? (
            <div className="flex items-center gap-1.5 min-w-0 max-w-[min(100%,280px)] border-l border-border pl-2 ml-0.5">
              <span className="text-sm font-medium truncate" title={loadedTemplate.name}>
                {loadedTemplate.name}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1"
                onClick={openRenameDialog}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Rename
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 order-3 sm:order-none sm:flex-1 sm:min-w-0">
          <Popover open={mergePopoverOpen} onOpenChange={setMergePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                title="Insert merge tags"
                aria-expanded={mergePopoverOpen}
                aria-haspopup="dialog"
              >
                <Tags className="w-4 h-4 mr-2" />
                Insert merge tag
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(calc(100vw-2rem),400px)] max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain p-3 touch-pan-y"
              align="center"
              side="bottom"
              sideOffset={6}
            >
              <MergeTagsPanel campaignJobId={campaignJobId} variant="popover" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap order-2 sm:order-none sm:shrink-0">
          <Button variant="outline" size="sm" onClick={handleContinue} type="button">
            {onSaveToTemplateLibrary ? 'Continue' : 'Done'}
          </Button>
          {onSaveToTemplateLibrary ? (
            <Button className="bg-gradient-primary hover:opacity-90" size="sm" onClick={handleSaveTemplate} type="button">
              Save template
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch min-h-0 overflow-hidden gap-0 lg:gap-4">
        <div className="flex-1 relative min-h-0 flex flex-col min-w-0 overflow-hidden p-4">
          {!helpBannerDismissed && (
            <Collapsible open={helpBannerOpen} onOpenChange={setHelpBannerOpen} className="shrink-0 mb-3">
              <Alert className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <AlertTitle
                      className="flex items-center gap-2 text-sm cursor-pointer"
                      onClick={() => setHelpBannerOpen(!helpBannerOpen)}
                    >
                      <Info className="w-4 h-4 shrink-0" />
                      Email editor tips
                      {helpBannerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </AlertTitle>
                    {!helpBannerOpen ? (
                      <p className="text-[11px] text-muted-foreground mt-1 pl-6">
                        Body format, templates, merge tags, AI assistant — expand for more.
                      </p>
                    ) : null}
                    <CollapsibleContent>
                      <AlertDescription className="mt-1.5 text-xs space-y-2 text-muted-foreground">
                        <ul className="list-disc pl-4 space-y-1.5">
                          <li>
                            <strong className="text-foreground">Visual</strong> = blocks or simple form;{' '}
                            <strong className="text-foreground">Code</strong> = full HTML. Use{' '}
                            <strong className="text-foreground">Insert merge tag</strong> for tokens like{' '}
                            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">{'{{jobUrl}}'}</kbd>.
                          </li>
                          <li>
                            <strong className="text-foreground">Continue</strong> applies this email to the campaign.{' '}
                            <strong className="text-foreground">Save template</strong> also stores it in your template library.
                          </li>
                          <li>
                            <strong className="text-foreground">Body format</strong> (blocks vs simple) only changes how you edit — your copy is
                            copied, not deleted. <strong className="text-foreground">Load from your templates</strong> uses designs you saved in
                            Clarity; <strong className="text-foreground">Starters</strong> (book icon) are built-in layouts.
                          </li>
                          <li>
                            Preview widths are approximate (~600px / ~390px). For Code HTML, prefer inline{' '}
                            <code className="text-[10px] px-1 rounded bg-muted">style=&quot;…&quot;</code> for the widest client support.
                          </li>
                          <li>
                            <strong className="text-foreground">AI assistant</strong> drafts or revises full emails (blocks, simple form, or
                            HTML). Turn on “Include current email” there to edit your existing draft.
                          </li>
                        </ul>
                      </AlertDescription>
                    </CollapsibleContent>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setHelpBannerDismissed(true)}
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Alert>
            </Collapsible>
          )}

          <Tabs
            value={workspaceTab}
            onValueChange={v => setWorkspaceTab(v as 'editor' | 'ai')}
            className="flex flex-col flex-1 min-h-0 gap-3 overflow-hidden"
          >
            <TabsList className="w-full max-w-md justify-start h-10 bg-muted/40 p-1">
              <TabsTrigger value="editor" className="text-sm">
                Editor
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-sm gap-1.5 data-[state=active]:bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 opacity-70" aria-hidden />
                AI assistant
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="editor"
              forceMount
              className="mt-1 flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 data-[state=inactive]:hidden"
            >
              <EmailComposer
                siteLabel={companyName}
                subject={subject}
                onSubjectChange={setSubject}
                composeKind={composeKind}
                onComposeKindChange={setComposeKind}
                htmlBody={htmlBody}
                onHtmlBodyChange={setHtmlBody}
                formPayload={formPayload}
                onFormPayloadChange={setFormPayload}
                codeTextareaRef={codeTextareaRef}
                previewSlot="external"
              />
            </TabsContent>

            <TabsContent
              value="ai"
              forceMount
              className="mt-1 flex flex-col flex-1 min-h-0 gap-2 overflow-hidden data-[state=inactive]:hidden"
            >
              <p className="text-[11px] text-muted-foreground leading-snug max-w-xl shrink-0">
                Saved per campaign this session. Audience is set in the campaign step.
              </p>
              <EmailAIChatPanel
                companyName={companyName}
                editorContext={editorContextForAi}
                onApply={applyAIEmailResult}
                onOpenEditor={() => setWorkspaceTab('editor')}
                onNewConversation={resetAiChat}
                messages={aiMessages}
                setMessages={setAiMessages}
                input={aiInput}
                setInput={setAiInput}
                includeContext={aiIncludeContext}
                setIncludeContext={setAiIncludeContext}
                llmSuggestions={aiLlmSuggestions}
                setLlmSuggestions={setAiLlmSuggestions}
                captureUndoSnapshot={captureAiUndoSnapshot}
                onRegisterUndo={registerAiUndo}
                onUndo={undoLastAiTurn}
                canUndo={aiUndoStack.length > 0}
                className="flex-1 min-h-0 h-full max-h-full overflow-hidden"
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="flex flex-col min-h-[220px] max-h-[45vh] lg:max-h-none lg:min-h-0 lg:w-[min(480px,42%)] lg:shrink-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-4 pt-3 lg:pt-4 px-4 pb-4 lg:pb-4 lg:pr-4 bg-muted/5">
          <EmailPreviewPane
            composeKind={composeKind}
            formPayload={formPayload}
            htmlBody={htmlBody}
            siteLabel={companyName}
            subject={subject}
            className="h-full min-h-0"
          />
        </aside>
      </div>
    </div>
  );
}
