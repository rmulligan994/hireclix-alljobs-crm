'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Tags, X, ChevronDown, ChevronUp } from 'lucide-react';
import { EmailPreviewPane } from './EmailPreviewPane';
import { toast } from 'sonner';
import { EmailComposer } from './EmailComposer';
import { EmailAIChatPanel } from './EmailAIChatPanel';
import { MergeTagsPanel } from '../MergeTagsPanel';
import {
  clearedRichBodyFields,
  emptyAnnouncementForm,
  payloadToAnnouncementForm,
  renderAnnouncementToHTML,
} from '@/lib/email/email-utils';
import type { AICampaignFormFields } from '@/lib/email/email-ai-adapter';
import { quickEditMessageBody } from '@/lib/email/email-ai-adapter';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';

export interface HtmlCampaignEmailEditorProps {
  initialSubject?: string;
  initialHtmlContent?: string | null;
  initialComposeKind?: ComposeKind | null;
  /** Raw JSON from DB — announcement form fields */
  initialFormPayload?: unknown;
  /** Used in AI assistant + rendered previews (same role as mailmerge-magic brand name). */
  companyName?: string;
  campaignJobId?: string | null;
  onSave: (payload: {
    html: string;
    subject: string;
    compose_kind: ComposeKind;
    form_payload: AnnouncementForm | null;
  }) => void;
  onCancel: () => void;
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
  onSave,
  onCancel,
}: HtmlCampaignEmailEditorProps) {
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
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
  const [helpBannerOpen, setHelpBannerOpen] = useState(true);
  const [helpBannerDismissed, setHelpBannerDismissed] = useState(false);

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

  const handleSave = useCallback(() => {
    const html = computeOutgoingHtml(composeKind, formPayload, htmlBody, companyName);
    onSave({
      html,
      subject,
      compose_kind: composeKind,
      form_payload: composeKind === 'announcement_form' ? formPayload : null,
    });
  }, [companyName, composeKind, formPayload, htmlBody, onSave, subject]);

  const applyAIFormFields = useCallback(
    (fields: AICampaignFormFields) => {
      setSubject(fields.subject);
      setFormPayload(prev => ({
        ...prev,
        previewText: fields.previewText,
        headline: fields.headline,
        subhead: fields.subhead,
        message: fields.message,
        buttonLabel: fields.buttonLabel,
        buttonUrl: fields.buttonUrl,
        signOff: fields.signOff,
        ...clearedRichBodyFields(),
      }));
      setComposeKind('announcement_form');
      toast.success('AI suggestions applied — review the Editor tab');
      setWorkspaceTab('editor');
    },
    [],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onCancel} type="button">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <div className="flex items-center space-x-2">
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
              className="w-[min(calc(100vw-2rem),400px)] p-0"
              align="center"
              side="bottom"
              sideOffset={6}
            >
              <div className="max-h-[min(70vh,520px)] overflow-y-auto p-3">
                <MergeTagsPanel campaignJobId={campaignJobId} />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Button className="bg-gradient-primary hover:opacity-90" size="sm" onClick={handleSave} type="button">
          Save Template
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:items-stretch min-h-0 overflow-hidden gap-0 lg:gap-4">
        <div className="flex-1 relative min-h-0 flex flex-col min-w-0 overflow-y-auto p-4">
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
                    <CollapsibleContent>
                      <AlertDescription className="mt-1.5 text-xs">
                        Use <strong>Visual</strong> for a structured layout or <strong>Code</strong> for full HTML. Open{' '}
                        <strong>Insert merge tag</strong> above to copy tokens. The live preview updates on the right (wide
                        screens). Links like{' '}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">{'{{jobUrl}}'}</kbd> resolve when the
                        campaign sends.
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

          <Tabs value={workspaceTab} onValueChange={v => setWorkspaceTab(v as 'editor' | 'ai')} className="space-y-3">
            <TabsList className="w-full max-w-md justify-start">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="ai">AI assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-1 space-y-3 min-h-0">
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

            <TabsContent value="ai" className="mt-1 space-y-4">
              <p className="text-xs text-muted-foreground">
                Same conversational assistant pattern as the mailmerge-magic reference — fill fields from a chat, then switch to Editor to refine.
                Campaign <strong>recipients</strong> are chosen in the campaign audience step, not here.
              </p>
              <EmailAIChatPanel companyName={companyName} onApplyFields={applyAIFormFields} />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick edits (body text)</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormPayload(fp => ({
                        ...fp,
                        message: quickEditMessageBody(fp.message, 'shorter'),
                        ...clearedRichBodyFields(),
                      }))
                    }
                  >
                    Make shorter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormPayload(fp => ({
                        ...fp,
                        message: quickEditMessageBody(fp.message, 'personal'),
                        ...clearedRichBodyFields(),
                      }))
                    }
                  >
                    More personal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormPayload(fp => ({
                        ...fp,
                        message: quickEditMessageBody(fp.message, 'urgency'),
                        ...clearedRichBodyFields(),
                      }))
                    }
                  >
                    Add urgency
                  </Button>
                </div>
              </div>
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
