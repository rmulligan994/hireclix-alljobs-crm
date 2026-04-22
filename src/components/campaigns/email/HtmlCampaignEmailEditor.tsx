'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Tags, X, ChevronDown, ChevronUp, Brain, Pencil } from 'lucide-react';
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
import {
  findUnknownMergeTagsInStrings,
  formatUnknownMergeTagsMessage,
} from '@/lib/email/merge-tags-validation';
import type { AIEmailAssistantResult } from '@/lib/email/email-ai-adapter';
import { mergeAIEmailAssistantResult } from '@/lib/email/apply-ai-email-result';
import { buildEmailAIEditorContext } from '@/lib/email/email-ai-editor-context';
import { buildEmailAiChatStorageKey } from '@/lib/email/email-ai-chat-storage-key';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';
import { cn } from '@/lib/utils';

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
  /** Brand or site name used in previews and when the AI describes your organization. */
  companyName?: string;
  campaignJobId?: string | null;
  /** Scopes AI chat persistence when a campaign row exists. */
  campaignId?: string | null;
  /** When there is no campaign id yet, scopes draft chat so each new composition starts fresh. */
  draftChatSessionId?: string | null;
  /** Optional disambiguator (e.g. sequence step id) so multiple editors do not share one chat slot. */
  aiChatScopeSuffix?: string | null;
  /**
   * Bumps when the user starts a new template / draft session. Local state resets from initial* props.
   * Must stay stable while the same draft is open so async parent updates (e.g. campaign email fetch)
   * do not wipe in-progress AI or manual edits.
   */
  editorSeed: string;
  /** Apply design and continue the flow without writing to the template library. */
  onContinue: (payload: HtmlCampaignEmailSavePayload) => void;
  /** Save to the template library: updates the selected template, or creates one if none is selected. */
  onSaveTemplate?: (payload: HtmlCampaignEmailSavePayload) => void;
  /** Always create a new template (after naming). */
  onSaveAsTemplate?: (payload: HtmlCampaignEmailSavePayload, name: string) => void;
  /** Default name in the “Save as template” dialog. */
  defaultSaveAsTemplateName?: string;
  onCancel: () => void;
  /** When the user opened the editor from a saved library template, enables rename in the toolbar. */
  loadedTemplate?: { id: string; name: string } | null;
  onRenameTemplate?: (templateId: string, newName: string) => void;
  /** Which workspace tab to show when the editor opens or when the template seed changes. */
  initialWorkspaceTab?: 'editor' | 'ai';
  /** When false, hides “Continue” (campaign flow). Use for standalone template library editing. Default true. */
  showCampaignContinue?: boolean;
}

function readStoredEmailAiChat(storageKey: string): {
  messages: ChatMessage[];
  input: string;
  include: boolean;
  llmSuggestions: string[];
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
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
  draftChatSessionId = null,
  aiChatScopeSuffix = null,
  editorSeed,
  onContinue,
  onSaveTemplate,
  onSaveAsTemplate,
  defaultSaveAsTemplateName = '',
  onCancel,
  loadedTemplate = null,
  onRenameTemplate,
  initialWorkspaceTab = 'editor',
  showCampaignContinue = true,
}: HtmlCampaignEmailEditorProps) {
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsNameDraft, setSaveAsNameDraft] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<'editor' | 'ai'>(() =>
    initialWorkspaceTab === 'ai' ? 'ai' : 'editor',
  );
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
  const mergeTagsScrollRef = useRef<HTMLDivElement>(null);
  /** Start collapsed so the editor surface isn’t buried under a long tip block. */
  const [helpBannerOpen, setHelpBannerOpen] = useState(false);
  const [helpBannerDismissed, setHelpBannerDismissed] = useState(false);

  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(() => createDefaultEmailAIMessages());
  const [aiInput, setAiInput] = useState('');
  const [aiIncludeContext, setAiIncludeContext] = useState(true);
  const [aiLlmSuggestions, setAiLlmSuggestions] = useState<string[]>([]);
  const [aiUndoStack, setAiUndoStack] = useState<AiEmailUndoSnapshot[]>([]);
  const [aiChatPersistReady, setAiChatPersistReady] = useState(false);

  const aiChatStorageKey = useMemo(
    () => buildEmailAiChatStorageKey(campaignId, draftChatSessionId, aiChatScopeSuffix),
    [campaignId, draftChatSessionId, aiChatScopeSuffix],
  );

  const initialFormKey = useMemo(
    () => (initialFormPayload == null ? 'null' : JSON.stringify(initialFormPayload)),
    [initialFormPayload],
  );

  const prevEditorSeedRef = useRef<string | null>(null);
  const prevInitialFormKeyRef = useRef<string | null>(null);
  /** True after the user or AI changes the draft — blocks parent prop resync until editorSeed changes. */
  const draftDirtyRef = useRef(false);

  const markDraftDirty = useCallback(() => {
    draftDirtyRef.current = true;
  }, []);

  const hydrateDraftFromParentProps = useCallback(() => {
    setSubject(initialSubject);
    setComposeKind(initialComposeKind === 'raw_html' ? 'raw_html' : 'announcement_form');
    setHtmlBody(initialHtmlContent ?? '');
    setFormPayload(
      initialFormPayload != null
        ? payloadToAnnouncementForm(initialFormPayload)
        : emptyAnnouncementForm(),
    );
    draftDirtyRef.current = false;
  }, [initialSubject, initialHtmlContent, initialComposeKind, initialFormPayload]);

  const fullResetFromParentProps = useCallback(() => {
    hydrateDraftFromParentProps();
    setWorkspaceTab(initialWorkspaceTab === 'ai' ? 'ai' : 'editor');
  }, [hydrateDraftFromParentProps, initialWorkspaceTab]);

  useEffect(() => {
    const seedChanged = prevEditorSeedRef.current !== editorSeed;

    if (seedChanged) {
      prevEditorSeedRef.current = editorSeed;
      prevInitialFormKeyRef.current = initialFormKey;
      fullResetFromParentProps();
      return;
    }

    const formKeyChanged = prevInitialFormKeyRef.current !== initialFormKey;
    if (formKeyChanged && !draftDirtyRef.current) {
      prevInitialFormKeyRef.current = initialFormKey;
      hydrateDraftFromParentProps();
      return;
    }

    if (formKeyChanged) {
      prevInitialFormKeyRef.current = initialFormKey;
    }
  }, [editorSeed, initialFormKey, fullResetFromParentProps, hydrateDraftFromParentProps]);

  const onSubjectChangeTracked = useCallback(
    (v: SetStateAction<string>) => {
      markDraftDirty();
      setSubject(v);
    },
    [markDraftDirty],
  );

  const onComposeKindChangeTracked = useCallback(
    (v: SetStateAction<ComposeKind>) => {
      markDraftDirty();
      setComposeKind(v);
    },
    [markDraftDirty],
  );

  const onHtmlBodyChangeTracked = useCallback(
    (v: SetStateAction<string>) => {
      markDraftDirty();
      setHtmlBody(v);
    },
    [markDraftDirty],
  );

  const onFormPayloadChangeTracked = useCallback(
    (v: SetStateAction<AnnouncementForm>) => {
      markDraftDirty();
      setFormPayload(v);
    },
    [markDraftDirty],
  );

  useEffect(() => {
    setAiChatPersistReady(false);
    const s = readStoredEmailAiChat(aiChatStorageKey);
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
  }, [aiChatStorageKey]);

  useEffect(() => {
    if (!aiChatPersistReady) return;
    try {
      sessionStorage.setItem(
        aiChatStorageKey,
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
  }, [aiChatPersistReady, aiChatStorageKey, aiMessages, aiInput, aiIncludeContext, aiLlmSuggestions]);

  /**
   * Trackpad / mouse wheel often chains to a scroll-locked ancestor (e.g. full-screen Dialog).
   * preventDefault alone would cancel scrolling on this div too; we apply scrollTop ourselves
   * whenever the list can still move, and stop propagation so the page/dialog doesn’t eat the delta.
   */
  useEffect(() => {
    if (!mergePopoverOpen) return undefined;

    let detach: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      const el = mergeTagsScrollRef.current;
      if (!el) return;

      const onWheel = (e: WheelEvent) => {
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        if (maxScroll <= 0) {
          e.stopPropagation();
          return;
        }
        const { scrollTop } = el;
        const dy = e.deltaY;
        const canScrollUp = scrollTop > 0;
        const canScrollDown = scrollTop < maxScroll - 0.5;

        if ((dy < 0 && canScrollUp) || (dy > 0 && canScrollDown)) {
          el.scrollTop = Math.max(0, Math.min(maxScroll, scrollTop + dy));
          e.preventDefault();
          e.stopPropagation();
        }
      };

      el.addEventListener('wheel', onWheel, { passive: false });
      detach = () => el.removeEventListener('wheel', onWheel);
    });

    return () => {
      cancelAnimationFrame(raf);
      detach?.();
    };
  }, [mergePopoverOpen]);

  const resetAiChat = useCallback(() => {
    setAiMessages(createDefaultEmailAIMessages());
    setAiInput('');
    setAiIncludeContext(true);
    setAiLlmSuggestions([]);
    setAiUndoStack([]);
    try {
      sessionStorage.removeItem(aiChatStorageKey);
    } catch {
      /* ignore */
    }
  }, [aiChatStorageKey]);

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
      draftDirtyRef.current = true;
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

  const outgoingHtmlForMergeCheck = useMemo(
    () => computeOutgoingHtml(composeKind, formPayload, htmlBody, companyName),
    [companyName, composeKind, formPayload, htmlBody],
  );

  const unknownMergeTags = useMemo(
    () => findUnknownMergeTagsInStrings(subject, outgoingHtmlForMergeCheck),
    [subject, outgoingHtmlForMergeCheck],
  );

  const mergeTagBlockMessage = unknownMergeTags.length
    ? formatUnknownMergeTagsMessage(unknownMergeTags)
    : '';
  const mergeTagsBlocked = unknownMergeTags.length > 0;

  const handleContinue = useCallback(() => {
    if (mergeTagsBlocked) {
      toast.error(mergeTagBlockMessage);
      return;
    }
    onContinue(buildPayload());
  }, [buildPayload, mergeTagBlockMessage, mergeTagsBlocked, onContinue]);

  const handleSaveTemplateClick = useCallback(() => {
    if (mergeTagsBlocked) {
      toast.error(mergeTagBlockMessage);
      return;
    }
    onSaveTemplate?.(buildPayload());
  }, [buildPayload, mergeTagBlockMessage, mergeTagsBlocked, onSaveTemplate]);

  const openSaveAsDialog = useCallback(() => {
    const base = defaultSaveAsTemplateName.trim() || loadedTemplate?.name?.trim() || '';
    setSaveAsNameDraft(base ? `Copy of ${base}` : 'New template');
    setSaveAsOpen(true);
  }, [defaultSaveAsTemplateName, loadedTemplate?.name]);

  const submitSaveAsTemplate = useCallback(() => {
    const trimmed = saveAsNameDraft.trim();
    if (!trimmed || !onSaveAsTemplate) return;
    if (mergeTagsBlocked) {
      toast.error(mergeTagBlockMessage);
      return;
    }
    onSaveAsTemplate(buildPayload(), trimmed);
    setSaveAsOpen(false);
  }, [buildPayload, mergeTagBlockMessage, mergeTagsBlocked, onSaveAsTemplate, saveAsNameDraft]);

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

  const applyAIEmailResult = useCallback(
    (result: AIEmailAssistantResult): boolean => {
      const next = mergeAIEmailAssistantResult(result);
      const html = computeOutgoingHtml(next.composeKind, next.formPayload, next.htmlBody, companyName);
      const bad = findUnknownMergeTagsInStrings(next.subject, html);
      if (bad.length) {
        toast.error(formatUnknownMergeTagsMessage(bad));
        return false;
      }
      draftDirtyRef.current = true;
      setSubject(next.subject);
      setComposeKind(next.composeKind);
      setHtmlBody(next.htmlBody);
      setFormPayload(next.formPayload);
      toast.success('Draft updated — preview on the right. Keep chatting here or open Editor to tweak manually.');
      return true;
    },
    [companyName],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              Creates a new template in your library. Your campaign is unchanged.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={saveAsNameDraft}
            onChange={(e) => setSaveAsNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitSaveAsTemplate();
              }
            }}
            placeholder="Template name"
            className="mt-1"
            autoFocus
            aria-label="New template name"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSaveAsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-primary hover:opacity-90"
              onClick={submitSaveAsTemplate}
              disabled={!saveAsNameDraft.trim() || mergeTagsBlocked}
              title={mergeTagsBlocked ? mergeTagBlockMessage : undefined}
            >
              Save as template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="flex flex-col gap-2 p-4 border-b border-border bg-card shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 gap-y-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
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

          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
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
                className="w-[min(calc(100vw-2rem),400px)] max-h-[min(70vh,520px)] p-0 flex flex-col overflow-hidden"
                align="center"
                side="bottom"
                sideOffset={6}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div
                  ref={mergeTagsScrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 touch-pan-y [-webkit-overflow-scrolling:touch]"
                >
                  <MergeTagsPanel campaignJobId={campaignJobId} variant="popover" />
                </div>
              </PopoverContent>
            </Popover>

            {onSaveTemplate || onSaveAsTemplate ? (
              <>
                {showCampaignContinue ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContinue}
                    type="button"
                    disabled={mergeTagsBlocked}
                    title={mergeTagsBlocked ? mergeTagBlockMessage : undefined}
                  >
                    Continue
                  </Button>
                ) : null}
                {onSaveTemplate ? (
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    size="sm"
                    onClick={handleSaveTemplateClick}
                    type="button"
                    disabled={mergeTagsBlocked}
                    title={mergeTagsBlocked ? mergeTagBlockMessage : undefined}
                  >
                    Save
                  </Button>
                ) : null}
                {onSaveAsTemplate ? (
                  <Button
                    variant={onSaveTemplate ? 'secondary' : 'default'}
                    size="sm"
                    onClick={openSaveAsDialog}
                    type="button"
                    disabled={mergeTagsBlocked}
                    title={mergeTagsBlocked ? mergeTagBlockMessage : undefined}
                    className={
                      onSaveTemplate
                        ? undefined
                        : 'bg-gradient-primary hover:opacity-90 text-primary-foreground border-0 shadow-sm'
                    }
                  >
                    Save as template
                  </Button>
                ) : null}
              </>
            ) : showCampaignContinue ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleContinue}
                type="button"
                disabled={mergeTagsBlocked}
                title={mergeTagsBlocked ? mergeTagBlockMessage : undefined}
              >
                Done
              </Button>
            ) : null}
          </div>
        </div>
        {mergeTagsBlocked ? (
          <p className="text-[11px] text-destructive leading-snug">{mergeTagBlockMessage}</p>
        ) : null}
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
                            {showCampaignContinue ? (
                              <>
                                <strong className="text-foreground">Continue</strong> applies this email to the campaign.{' '}
                                <strong className="text-foreground">Save as template</strong> also stores it in your library.
                              </>
                            ) : (
                              <>
                                Use <strong className="text-foreground">Save</strong> or{' '}
                                <strong className="text-foreground">Save as template</strong> to update your template library.
                              </>
                            )}
                          </li>
                          <li>
                            <strong className="text-foreground">Body format</strong> (blocks vs simple) only changes how you edit — your full layout
                            (including images and extras) is kept, and simple fields stay aligned with the structured body.{' '}
                            <strong className="text-foreground">Load from your templates</strong> uses designs you saved in Clarity;{' '}
                            <strong className="text-foreground">Starters</strong> (book icon) are built-in layouts.
                          </li>
                          <li>
                            Preview widths are approximate (desktop and mobile). In HTML mode, inline styles often render most consistently across
                            inboxes.
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
            <TabsList className="w-full max-w-md justify-start h-10 bg-transparent p-0 gap-1.5">
              <TabsTrigger
                value="editor"
                className="flex-1 rounded-md border-2 border-sunrise px-3 py-2 text-sm font-medium shadow-none data-[state=active]:bg-sunrise data-[state=active]:text-slate-900 data-[state=active]:border-sunrise data-[state=inactive]:bg-transparent"
              >
                Editor
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="flex-1 gap-1.5 rounded-md border-2 border-sunrise px-3 py-2 text-sm font-medium shadow-none data-[state=active]:bg-sunrise data-[state=active]:text-slate-900 data-[state=active]:border-sunrise data-[state=inactive]:bg-transparent"
              >
                <Brain className={cn('h-3.5 w-3.5 shrink-0', workspaceTab === 'ai' ? 'text-slate-900' : 'text-sky-blue')} aria-hidden />
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
                onSubjectChange={onSubjectChangeTracked}
                composeKind={composeKind}
                onComposeKindChange={onComposeKindChangeTracked}
                htmlBody={htmlBody}
                onHtmlBodyChange={onHtmlBodyChangeTracked}
                formPayload={formPayload}
                onFormPayloadChange={onFormPayloadChangeTracked}
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
                This conversation is saved while you work on this campaign in this browser tab. Recipients are chosen in the campaign steps.
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
