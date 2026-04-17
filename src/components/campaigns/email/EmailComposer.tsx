import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sparkles, Upload, Clipboard, BookOpen, Globe, ChevronDown, Monitor, Smartphone, Plus, X, ArrowUp, ArrowDown, Image, Type, Heading, MousePointerClick, Minus, FolderOpen, Info, ArrowDownToLine, LayoutList } from 'lucide-react';
import { toast } from 'sonner';
import type { AnnouncementForm, ComposeKind, ContentBlock } from '@/types/email-types';
import { emptyAnnouncementForm, stripEmailScripts, renderAnnouncementToHTML, parseHtmlToBlocks, genBlockId, getEmailEditorPreviewHtml } from '@/lib/email/email-utils';
import {
  buildFormPayloadFromImportedHtml,
  planScratchEmailHtmlImport,
  SCRATCH_HTML_IMPORT_COPY,
} from '@/lib/email/email-html-import-flow';
import type { PrepareRegionMappingResult } from '@/lib/email/email-region-detection';
import { AnnouncementLayoutPreview } from './AnnouncementLayoutPreview';
import { StarterLibraryDialog } from './StarterLibraryDialog';
import type { StarterTemplate } from '@/data/email-starter-data';
import { WebflowAssetPicker } from './WebflowAssetPicker';
import { RegionMappingReviewDialog } from './RegionMappingReviewDialog';
import { EmailImagesPanel } from './EmailImagesPanel';
import { emailAiRequest } from '@/lib/email/email-ai-api-client';

interface EmailComposerProps {
  /** Shown in previews and in rendered HTML (brand / site label). */
  siteLabel?: string;
  subject: string;
  onSubjectChange: (s: string) => void;
  composeKind: ComposeKind;
  onComposeKindChange: (k: ComposeKind) => void;
  htmlBody: string;
  onHtmlBodyChange: (h: string) => void;
  formPayload: AnnouncementForm;
  onFormPayloadChange: (f: AnnouncementForm) => void;
  codeTextareaRef: React.RefObject<HTMLTextAreaElement>;
  /** When `external`, preview is rendered by the parent (e.g. split layout). */
  previewSlot?: 'inline' | 'external';
}

// ========== Block Editor Components ==========

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, onOpenAssetPicker }: {
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onOpenAssetPicker?: () => void;
}) {
  const controls = (
    <div className="flex items-center gap-0.5 shrink-0">
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}><ArrowUp className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}><ArrowDown className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}><X className="h-3 w-3" /></Button>
    </div>
  );

  switch (block.type) {
    case 'heading':
      return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Heading (H{block.level})</Label>
              <select
                className="text-xs border rounded px-1 py-0.5 bg-background"
                value={block.level}
                onChange={e => onChange({ ...block, level: parseInt(e.target.value) as 1 | 2 | 3 })}
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </div>
            <Input value={block.text} onChange={e => onChange({ ...block, text: e.target.value })} placeholder="Heading text" className="h-8 text-sm" />
          </div>
          {controls}
        </div>
      );
    case 'text':
      return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Text</Label>
            <Textarea value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} placeholder="Paragraph text..." rows={3} className="text-sm" />
          </div>
          {controls}
        </div>
      );
    case 'image':
      return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Image</Label>
            <div className="flex gap-1.5">
              <Input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })} placeholder="Image URL" className="h-8 text-sm flex-1" />
              <Button variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={onOpenAssetPicker} title="Browse Webflow Assets">
                <FolderOpen className="h-3.5 w-3.5 mr-1" /> Assets
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Input value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })} placeholder="Alt text" className="h-8 text-sm flex-1" />
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  type="number"
                  value={block.width ?? 600}
                  onChange={e => onChange({ ...block, width: parseInt(e.target.value) || 600 })}
                  className="h-8 text-sm w-20"
                  min={50}
                  max={600}
                  title="Display width in pixels"
                />
                <span className="text-[10px] text-muted-foreground">px</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>Recommended: 600px wide, JPG/PNG. Images scale to fit the email.</span>
            </div>
            {block.url && (
              <div className="mt-1 border rounded overflow-hidden bg-muted/30 max-h-24">
                <img src={block.url} alt={block.alt} className="max-w-full h-auto max-h-24 object-contain" />
              </div>
            )}
          </div>
          {controls}
        </div>
      );
    case 'button':
      return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Button</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input value={block.label} onChange={e => onChange({ ...block, label: e.target.value })} placeholder="Button label" className="h-8 text-sm" />
              <Input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })} placeholder="Button URL" className="h-8 text-sm" />
            </div>
          </div>
          {controls}
        </div>
      );
    case 'divider':
      return (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Divider</Label>
            <hr className="mt-1 border-border" />
          </div>
          {controls}
        </div>
      );
    case 'spacer':
      return (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Spacer</Label>
            <Input type="number" value={block.height} onChange={e => onChange({ ...block, height: parseInt(e.target.value) || 16 })} className="h-8 text-sm w-20" min={8} max={120} />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          {controls}
        </div>
      );
    default:
      return null;
  }
}

// ========== Main Composer ==========

export function EmailComposer({
  siteLabel = 'Your Company',
  subject, onSubjectChange,
  composeKind, onComposeKindChange,
  htmlBody, onHtmlBodyChange,
  formPayload, onFormPayloadChange,
  codeTextareaRef,
  previewSlot = 'inline',
}: EmailComposerProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [pasteHtml, setPasteHtml] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerBlockId, setAssetPickerBlockId] = useState<string | null>(null);
  const [regionReviewOpen, setRegionReviewOpen] = useState(false);
  const [regionReviewPrepare, setRegionReviewPrepare] = useState<PrepareRegionMappingResult | null>(null);

  const SIGN_OFF_IMPORT_DEFAULT = 'Best,\nYour Team';

  const finalizeRegionalHtml = (html: string, toastMsg?: string) => {
    onHtmlBodyChange(html);
    onComposeKindChange('raw_html');
    onFormPayloadChange(buildFormPayloadFromImportedHtml(html, SIGN_OFF_IMPORT_DEFAULT));
    if (toastMsg) toast.success(toastMsg);
  };

  const beginHtmlImport = (raw: string) => {
    const plan = planScratchEmailHtmlImport(raw);
    if (plan.kind === 'empty') {
      toast.error(SCRATCH_HTML_IMPORT_COPY.noHtmlToImport);
      return;
    }
    if (plan.kind === 'assignable_regions') {
      finalizeRegionalHtml(plan.html, SCRATCH_HTML_IMPORT_COPY.toastAssignableRegions);
      return;
    }
    if (plan.kind === 'static_html') {
      onHtmlBodyChange(plan.html);
      onComposeKindChange('raw_html');
      toast.message(SCRATCH_HTML_IMPORT_COPY.toastStaticFallback);
      return;
    }
    setRegionReviewPrepare(plan.prep);
    setRegionReviewOpen(true);
  };

  // Parse HTML into blocks and switch to visual mode
  const applyHtmlWithParsing = (html: string) => {
    const clean = stripEmailScripts(html);
    onHtmlBodyChange(clean);
    const blocks = parseHtmlToBlocks(clean);
    if (blocks.length > 0) {
      onFormPayloadChange({ ...emptyAnnouncementForm(), blocks, useBlocks: true });
      onComposeKindChange('announcement_form');
      toast.success(`Extracted ${blocks.length} content blocks from HTML`);
    } else {
      onComposeKindChange('raw_html');
    }
  };

  const handleAISuggestSubject = async () => {
    setSuggestBusy(true);
    try {
      const r = await emailAiRequest({ mode: 'subject_suggestions', prompt: subject });
      if ('suggestions' in r && r.suggestions?.length) {
        onSubjectChange(r.suggestions[0]);
        toast.success('Applied a suggested subject line — edit as needed');
      } else {
        toast.info('No suggestions returned — try adding a few words to the subject first.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Subject suggestion failed');
    } finally {
      setSuggestBusy(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('File too large (max 500KB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      beginHtmlImport(String(reader.result || ''));
      toast.success('HTML file loaded');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteApply = () => {
    if (!pasteHtml.trim()) {
      toast.error(SCRATCH_HTML_IMPORT_COPY.pasteEmptyError);
      return;
    }
    beginHtmlImport(pasteHtml);
    setPasteHtml('');
    setPasteOpen(false);
  };

  const handleStarterSelect = (template: StarterTemplate) => {
    applyHtmlWithParsing(template.html);
    setStarterOpen(false);
  };

  // Handle tab switching with bidirectional sync
  const handleTabChange = (newKind: string) => {
    const kind = newKind as ComposeKind;
    if (kind === 'raw_html' && composeKind === 'announcement_form') {
      // Visual → Code: render blocks/form to HTML
      const html = renderAnnouncementToHTML(formPayload, { siteName: siteLabel });
      onHtmlBodyChange(html);
    } else if (kind === 'announcement_form' && composeKind === 'raw_html') {
      // Code → Visual: parse HTML into blocks
      if (htmlBody.trim()) {
        const blocks = parseHtmlToBlocks(htmlBody);
        if (blocks.length > 0) {
          onFormPayloadChange({ ...emptyAnnouncementForm(), blocks, useBlocks: true });
          toast.info('Fields extracted from HTML — review for accuracy');
        }
      }
    }
    onComposeKindChange(kind);
  };

  // Block manipulation helpers
  const updateBlock = (id: string, updated: ContentBlock) => {
    onFormPayloadChange({
      ...formPayload,
      blocks: formPayload.blocks.map(b => b.id === id ? updated : b),
    });
  };

  const deleteBlock = (id: string) => {
    onFormPayloadChange({
      ...formPayload,
      blocks: formPayload.blocks.filter(b => b.id !== id),
    });
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const blocks = [...formPayload.blocks];
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
    onFormPayloadChange({ ...formPayload, blocks });
  };

  const addBlock = (type: ContentBlock['type']) => {
    let block: ContentBlock;
    const id = genBlockId();
    switch (type) {
      case 'heading': block = { type: 'heading', id, text: '', level: 2 }; break;
      case 'text': block = { type: 'text', id, content: '' }; break;
      case 'image': block = { type: 'image', id, url: '', alt: '' }; break;
      case 'button': block = { type: 'button', id, label: '', url: '' }; break;
      case 'divider': block = { type: 'divider', id }; break;
      case 'spacer': block = { type: 'spacer', id, height: 24 }; break;
      default: return;
    }
    onFormPayloadChange({
      ...formPayload,
      blocks: [...formPayload.blocks, block],
      useBlocks: true,
    });
  };

  const previewHtml = getEmailEditorPreviewHtml(composeKind, formPayload, htmlBody, siteLabel);

  return (
    <div className="space-y-4">
      {/* Subject */}
      <div className="space-y-2">
        <Label>Subject Line</Label>
        <div className="flex gap-2">
          <Input value={subject} onChange={e => onSubjectChange(e.target.value)} placeholder="Enter email subject..." className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => void handleAISuggestSubject()} type="button" disabled={suggestBusy}>
            <Sparkles className="h-4 w-4 mr-1" />
            {suggestBusy ? '…' : 'Suggest'}
          </Button>
        </div>
      </div>

      {/* Compose mode tabs */}
      <Tabs value={composeKind} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="announcement_form">Visual</TabsTrigger>
            <TabsTrigger value="raw_html">Code</TabsTrigger>
          </TabsList>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Import HTML">
              <Upload className="h-4 w-4" />
            </Button>
            <input ref={fileInputRef} type="file" accept=".html" className="hidden" onChange={handleImportFile} />
            <Button variant="ghost" size="icon" onClick={() => setPasteOpen(!pasteOpen)} title="Paste HTML">
              <Clipboard className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setStarterOpen(true)} title="Starter Library">
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              title="Webflow assets"
              onClick={() =>
                toast.info('Add an Image block in Visual mode, then use Assets on that block to pick from Webflow or paste a URL.')
              }
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Paste HTML collapsible */}
        {pasteOpen && (
          <Card className="mt-2">
            <CardContent className="pt-4 space-y-2">
              <Textarea value={pasteHtml} onChange={e => setPasteHtml(e.target.value)} placeholder="Paste your HTML here..." rows={6} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePasteApply}>Apply</Button>
                <Button size="sm" variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visual mode — Dynamic Block Editor */}
        <TabsContent value="announcement_form" className="space-y-3">
          {formPayload.useBlocks ? (
            <>
              {formPayload.blocks.length === 0 && (
                <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
                  No blocks yet. Add a heading, text, image, or button below. You can reorder blocks or remove any block.
                </p>
              )}
              <div className="space-y-2">
                {formPayload.blocks.map((block, idx) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    onChange={(b) => updateBlock(block.id, b)}
                    onDelete={() => deleteBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, -1)}
                    onMoveDown={() => moveBlock(block.id, 1)}
                    isFirst={idx === 0}
                    isLast={idx === formPayload.blocks.length - 1}
                    onOpenAssetPicker={() => {
                      setAssetPickerBlockId(block.id);
                      setAssetPickerOpen(true);
                    }}
                  />
                ))}
              </div>
              {/* Add block */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Add Block
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => addBlock('heading')}><Heading className="h-4 w-4 mr-2" /> Heading</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('text')}><Type className="h-4 w-4 mr-2" /> Text</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('image')}><Image className="h-4 w-4 mr-2" /> Image</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('button')}><MousePointerClick className="h-4 w-4 mr-2" /> Button</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('divider')}><Minus className="h-4 w-4 mr-2" /> Divider</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('spacer')}><ArrowDownToLine className="h-4 w-4 mr-2" /> Spacer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() =>
                  onFormPayloadChange({
                    ...formPayload,
                    useBlocks: false,
                  })
                }
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Use classic fields instead
              </Button>
            </>
          ) : (
            /* Legacy flat-field form */
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  onFormPayloadChange({
                    ...formPayload,
                    useBlocks: true,
                    blocks: [],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Use block layout
              </Button>
              <div className="space-y-2">
                <Label>Eyebrow</Label>
                <Input
                  value={formPayload.eyebrow}
                  onChange={e => onFormPayloadChange({ ...formPayload, eyebrow: e.target.value })}
                  placeholder="Short label above the headline (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Preview text (inbox)</Label>
                <Input
                  value={formPayload.previewText}
                  onChange={e => onFormPayloadChange({ ...formPayload, previewText: e.target.value })}
                  placeholder="Hidden preheader line shown after subject in some clients"
                />
              </div>
              <div className="space-y-2">
                <Label>Headline *</Label>
                <Input value={formPayload.headline} onChange={e => onFormPayloadChange({ ...formPayload, headline: e.target.value })} placeholder="Main headline" />
              </div>
              <div className="space-y-2">
                <Label>Subhead</Label>
                <Input value={formPayload.subhead} onChange={e => onFormPayloadChange({ ...formPayload, subhead: e.target.value })} placeholder="Optional subheadline" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={formPayload.message} onChange={e => onFormPayloadChange({ ...formPayload, message: e.target.value })} placeholder="Email body text" rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Button Label</Label>
                  <Input value={formPayload.buttonLabel} onChange={e => onFormPayloadChange({ ...formPayload, buttonLabel: e.target.value })} placeholder="e.g. Apply Now" />
                </div>
                <div className="space-y-2">
                  <Label>Button URL</Label>
                  <Input value={formPayload.buttonUrl} onChange={e => onFormPayloadChange({ ...formPayload, buttonUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sign-off</Label>
                <Input value={formPayload.signOff} onChange={e => onFormPayloadChange({ ...formPayload, signOff: e.target.value })} placeholder="e.g. Best regards, The Team" />
              </div>
            </>
          )}
        </TabsContent>

        {/* Code mode */}
        <TabsContent value="raw_html" className="space-y-2">
          <Textarea
            ref={codeTextareaRef}
            value={htmlBody}
            onChange={e => onHtmlBodyChange(e.target.value)}
            placeholder="<html>...</html>"
            rows={12}
            className="font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

      {composeKind === 'raw_html' && <EmailImagesPanel htmlBody={htmlBody} onHtmlBodyChange={onHtmlBodyChange} />}

      {previewSlot === 'inline' && (
        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Preview</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex gap-1 mb-2">
              <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewport('desktop')}>
                <Monitor className="h-4 w-4" />
              </Button>
              <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewport('mobile')}>
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
            {composeKind === 'announcement_form' ? (
              <AnnouncementLayoutPreview form={formPayload} viewport={viewport} siteLabel={siteLabel} />
            ) : (
              <div className="flex justify-center w-full">
                <div
                  className="border rounded-md overflow-hidden bg-background shadow-sm"
                  style={{ width: viewport === 'mobile' ? 390 : 600, maxWidth: '100%' }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full border-0"
                    style={{ height: 400 }}
                    title="Email Preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      <RegionMappingReviewDialog
        open={regionReviewOpen}
        onOpenChange={(open) => {
          setRegionReviewOpen(open);
          if (!open) setRegionReviewPrepare(null);
        }}
        prepare={regionReviewPrepare}
        onConfirm={(html) => {
          finalizeRegionalHtml(html, SCRATCH_HTML_IMPORT_COPY.toastRegionMapped);
          setRegionReviewOpen(false);
          setRegionReviewPrepare(null);
        }}
      />

      <StarterLibraryDialog open={starterOpen} onOpenChange={setStarterOpen} onSelect={handleStarterSelect} />
      <WebflowAssetPicker
        open={assetPickerOpen}
        onOpenChange={setAssetPickerOpen}
        onSelect={(asset) => {
          if (assetPickerBlockId) {
            const block = formPayload.blocks.find(b => b.id === assetPickerBlockId);
            if (block && block.type === 'image') {
              updateBlock(assetPickerBlockId, {
                ...block,
                url: asset.url,
                alt: asset.name,
                width: asset.dimensions ? Math.min(asset.dimensions.width, 600) : 600,
                webflowAssetId: asset.id,
              });
            }
          }
          setAssetPickerBlockId(null);
        }}
      />
    </div>
  );
}
