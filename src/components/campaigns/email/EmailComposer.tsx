import { Fragment, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Upload, Clipboard, BookOpen, Globe, ChevronDown, Monitor, Smartphone, Plus, X, Image, Type, Heading, MousePointerClick, Minus, FolderOpen, Info, ArrowDownToLine, LayoutList, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { AnnouncementForm, ComposeKind, ContentBlock } from '@/types/email-types';
import {
  emptyAnnouncementForm,
  stripEmailScripts,
  renderAnnouncementToHTML,
  parseHtmlToBlocks,
  genBlockId,
  getEmailEditorPreviewHtml,
  classicAnnouncementFieldsToBlocks,
  blocksToClassicAnnouncementFields,
  payloadToAnnouncementForm,
} from '@/lib/email/email-utils';
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
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextInlineEditor } from './RichTextInlineEditor';
import { EmailTemplatePickerDialog } from './EmailTemplatePickerDialog';
import type { EmailTemplate } from '@/services/emailTemplateService';

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

/** Height in px; local empty allowed while typing; on blur empty → defaultHeight. */
function SpacerBlockHeightField({
  height,
  defaultHeight,
  onCommit,
}: {
  height: number;
  defaultHeight: number;
  onCommit: (h: number) => void;
}) {
  const [text, setText] = useState(() => String(height));
  useEffect(() => {
    setText(String(height));
  }, [height]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || /^\d{1,3}$/.test(v)) {
          setText(v);
        }
      }}
      onBlur={() => {
        const t = text.trim();
        if (t === '') {
          onCommit(defaultHeight);
          setText(String(defaultHeight));
          return;
        }
        const n = parseInt(t, 10);
        if (Number.isNaN(n)) {
          setText(String(height));
          return;
        }
        const clamped = Math.min(120, Math.max(8, n));
        onCommit(clamped);
        setText(String(clamped));
      }}
      placeholder={String(defaultHeight)}
      className="h-8 text-sm w-20 tabular-nums"
      title="Height in pixels (8–120)."
    />
  );
}

/** Optional width (px); empty = automatic in sent HTML / preview. */
function ImageBlockWidthField({
  width,
  onCommit,
}: {
  width?: number;
  onCommit: (w: number | undefined) => void;
}) {
  const [text, setText] = useState(() => (width === undefined ? '' : String(width)));
  useEffect(() => {
    setText(width === undefined ? '' : String(width));
  }, [width]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || /^\d{0,4}$/.test(v)) {
          setText(v);
        }
      }}
      onBlur={() => {
        const t = text.trim();
        if (t === '') {
          onCommit(undefined);
          return;
        }
        const n = parseInt(t, 10);
        if (Number.isNaN(n)) {
          setText(width === undefined ? '' : String(width));
          return;
        }
        const clamped = Math.min(600, Math.max(50, n));
        onCommit(clamped);
        setText(String(clamped));
      }}
      placeholder="Auto"
      className="h-8 text-sm w-[4.5rem] tabular-nums"
      title="Optional width in pixels. Leave empty for automatic sizing."
    />
  );
}

/** Explains blocks vs simple form vs templates vs toolbar imports — one place so users aren’t lost. */
function VisualLayoutHelpPanel({
  mode,
  onLoadSavedTemplate,
  onSwitchToBlocks,
  onSwitchToSimple,
}: {
  mode: 'blocks' | 'simple';
  onLoadSavedTemplate: () => void;
  onSwitchToBlocks: () => void;
  onSwitchToSimple: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/25 px-3 py-3 space-y-3">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">Body format</span>
          <Badge variant={mode === 'blocks' ? 'default' : 'secondary'} className="text-[10px] font-normal tabular-nums">
            {mode === 'blocks' ? 'Blocks' : 'Simple form'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {mode === 'blocks'
            ? 'Sections you can reorder and add to. Use when you want images, spacing, or a custom order.'
            : 'One field per part of the email (headline, message, button…). Use when you want a quick, linear layout.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto justify-center" onClick={onLoadSavedTemplate}>
          <LayoutList className="h-4 w-4 mr-2 shrink-0" />
          Load from your templates
        </Button>
        {mode === 'blocks' ? (
          <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto justify-center text-muted-foreground" onClick={onSwitchToSimple}>
            Switch to simple form
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto justify-center text-muted-foreground" onClick={onSwitchToBlocks}>
            Switch to blocks
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground border-t border-border/70 pt-2.5 leading-relaxed">
        <span className="font-medium text-foreground/90">Saved templates</span> are emails you stored in Clarity — loading one replaces this draft’s
        subject and body.
        <span className="block mt-1.5">
          <span className="font-medium text-foreground/90">Starters</span> (book icon in the toolbar) are built-in layouts.{' '}
          <span className="font-medium text-foreground/90">Import / Paste</span> bring your own HTML. Switching between blocks and simple form keeps
          your text — it is copied, not deleted.
        </span>
      </p>
    </div>
  );
}

function AddBlockMenuItems({ onPick }: { onPick: (t: ContentBlock['type']) => void }) {
  return (
    <>
      <DropdownMenuItem onClick={() => onPick('heading')}><Heading className="h-4 w-4 mr-2" /> Heading</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onPick('text')}><Type className="h-4 w-4 mr-2" /> Text</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onPick('image')}><Image className="h-4 w-4 mr-2" /> Image</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onPick('button')}><MousePointerClick className="h-4 w-4 mr-2" /> Button</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onPick('divider')}><Minus className="h-4 w-4 mr-2" /> Divider</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onPick('spacer')}><ArrowDownToLine className="h-4 w-4 mr-2" /> Spacer</DropdownMenuItem>
    </>
  );
}

function BlockInsertRow({ onInsert }: { onInsert: (type: ContentBlock['type']) => void }) {
  return (
    <div className="group relative flex items-center justify-center py-1.5 min-h-[32px] -my-0.5">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all z-10 bg-background shadow-sm border-dashed"
            aria-label="Add block here"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-72 overflow-y-auto">
          <AddBlockMenuItems onPick={onInsert} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SortableBlockRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
      <button
        type="button"
        className="mt-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded shrink-0 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function BlockEditor({ block, onChange, onDelete, onOpenAssetPicker }: {
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
  onDelete: () => void;
  onOpenAssetPicker?: () => void;
}) {
  const controls = (
    <div className="flex items-center gap-0.5 shrink-0">
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
            <RichTextInlineEditor
              editorKey={block.id}
              valuePlain={block.text}
              valueHtml={block.textHtml ?? null}
              onChange={(plain, html) => onChange({ ...block, text: plain, textHtml: html })}
              placeholder="Heading text"
              singleLine
              minHeightClass="min-h-[40px]"
            />
          </div>
          {controls}
        </div>
      );
    case 'text':
      return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Text</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Toolbar: bold, italic, underline, color.</p>
            <RichTextInlineEditor
              editorKey={block.id}
              valuePlain={block.content}
              valueHtml={block.contentHtml ?? null}
              onChange={(plain, html) => onChange({ ...block, content: plain, contentHtml: html })}
              placeholder="Paragraph text…"
              minHeightClass="min-h-[96px]"
            />
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
                <ImageBlockWidthField
                  width={block.width}
                  onCommit={(w) => onChange({ ...block, width: w })}
                />
                <span className="text-[10px] text-muted-foreground w-5">px</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>600px wide images work well; width is optional (Auto = responsive in the email).</span>
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
            <SpacerBlockHeightField
              height={block.height}
              defaultHeight={24}
              onCommit={(h) => onChange({ ...block, height: h })}
            />
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
  const [pasteHtml, setPasteHtml] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerBlockId, setAssetPickerBlockId] = useState<string | null>(null);
  const [regionReviewOpen, setRegionReviewOpen] = useState(false);
  const [regionReviewPrepare, setRegionReviewPrepare] = useState<PrepareRegionMappingResult | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

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

  const createBlock = (type: ContentBlock['type']): ContentBlock => {
    const id = genBlockId();
    switch (type) {
      case 'heading': return { type: 'heading', id, text: '', level: 2 };
      case 'text': return { type: 'text', id, content: '' };
      case 'image': return { type: 'image', id, url: '', alt: '' };
      case 'button': return { type: 'button', id, label: '', url: '' };
      case 'divider': return { type: 'divider', id };
      case 'spacer': return { type: 'spacer', id, height: 24 };
      default: {
        const _n: never = type;
        throw new Error(`Unknown block type: ${String(_n)}`);
      }
    }
  };

  const insertBlockAt = (index: number, type: ContentBlock['type']) => {
    const block = createBlock(type);
    const blocks = [...formPayload.blocks];
    const i = Math.max(0, Math.min(index, blocks.length));
    blocks.splice(i, 0, block);
    onFormPayloadChange({ ...formPayload, blocks, useBlocks: true });
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleBlocksDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = formPayload.blocks.findIndex(b => b.id === active.id);
    const newIndex = formPayload.blocks.findIndex(b => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onFormPayloadChange({
      ...formPayload,
      blocks: arrayMove(formPayload.blocks, oldIndex, newIndex),
    });
  };

  const previewHtml = getEmailEditorPreviewHtml(composeKind, formPayload, htmlBody, siteLabel);

  const applyLoadedTemplate = (template: EmailTemplate | null) => {
    if (template === null) {
      onSubjectChange('');
      onHtmlBodyChange('');
      onComposeKindChange('announcement_form');
      onFormPayloadChange(emptyAnnouncementForm());
      toast.success('Starting from a blank email');
      return;
    }
    const ck = template.compose_kind === 'raw_html' ? 'raw_html' : 'announcement_form';
    onComposeKindChange(ck);
    onSubjectChange(template.subject ?? '');
    onHtmlBodyChange(template.html_content ?? '');
    onFormPayloadChange(
      template.form_payload != null ? payloadToAnnouncementForm(template.form_payload) : emptyAnnouncementForm(),
    );
    toast.success(`Loaded “${template.name}”`);
  };

  return (
    <div className="space-y-5">
      {/* Inbox: subject + preheader */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4 shadow-sm">
        <div>
          <Label className="text-sm font-medium mb-1.5 block">Subject line</Label>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="What recipients see in their inbox"
            className="text-[15px] font-medium"
          />
        </div>

        {composeKind === 'announcement_form' && (
          <div className="space-y-1.5 pt-1 border-t border-border/80">
            <Label className="text-sm text-muted-foreground">Preview text (preheader)</Label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Shown after the subject in many clients — optional second line.
            </p>
            <Input
              value={formPayload.previewText}
              onChange={(e) => onFormPayloadChange({ ...formPayload, previewText: e.target.value })}
              placeholder="e.g. New roles this week · apply in one click"
              className="text-sm"
            />
          </div>
        )}
      </div>

      {/* Compose mode tabs */}
      <Tabs value={composeKind} onValueChange={handleTabChange}>
        <div className="rounded-lg border border-border bg-card/40 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-foreground">Body</p>
              <p className="text-[11px] text-muted-foreground">
                Visual: blocks or simple form · Code: full HTML
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
              <TabsList className="h-9">
                <TabsTrigger value="announcement_form" className="text-xs sm:text-sm">
                  Visual
                </TabsTrigger>
                <TabsTrigger value="raw_html" className="text-xs sm:text-sm">
                  Code
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-0.5 border rounded-md bg-background/80 p-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()} title="Import HTML file">
                  <Upload className="h-4 w-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept=".html" className="hidden" onChange={handleImportFile} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPasteOpen(!pasteOpen)} title="Paste HTML">
                  <Clipboard className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStarterOpen(true)}
                  title="Built-in starter layouts (not your saved templates)"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  title="Webflow assets (use on an Image block)"
                  onClick={() =>
                    toast.info('Add an Image block in Visual mode, then use Assets on that block to pick from Webflow or paste a URL.')
                  }
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Paste HTML collapsible */}
          {pasteOpen && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-2">
                <Label className="text-xs text-muted-foreground">Paste HTML</Label>
                <Textarea value={pasteHtml} onChange={e => setPasteHtml(e.target.value)} placeholder="Paste HTML here…" rows={6} />
                <div className="flex gap-2">
                  <Button size="sm" type="button" onClick={handlePasteApply}>
                    Apply
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setPasteOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Visual mode — format explainer + block editor or simple form */}
        <TabsContent value="announcement_form" className="space-y-3">
          <VisualLayoutHelpPanel
            mode={formPayload.useBlocks ? 'blocks' : 'simple'}
            onLoadSavedTemplate={() => setTemplatePickerOpen(true)}
            onSwitchToBlocks={() =>
              onFormPayloadChange({
                ...formPayload,
                useBlocks: true,
                blocks: classicAnnouncementFieldsToBlocks(formPayload),
              })
            }
            onSwitchToSimple={() =>
              onFormPayloadChange(blocksToClassicAnnouncementFields(formPayload.blocks, formPayload))
            }
          />
          {formPayload.useBlocks ? (
            <>
              {formPayload.blocks.length === 0 && (
                <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
                  Hover a line to add a block, or use Add block at the bottom. Drag the grip to reorder.
                </p>
              )}
              {formPayload.blocks.length === 0 ? (
                <BlockInsertRow onInsert={(t) => insertBlockAt(0, t)} />
              ) : (
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleBlocksDragEnd}>
                  <SortableContext items={formPayload.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {formPayload.blocks.map((block, idx) => (
                      <Fragment key={block.id}>
                        <BlockInsertRow onInsert={(t) => insertBlockAt(idx, t)} />
                        <SortableBlockRow id={block.id}>
                          <BlockEditor
                            block={block}
                            onChange={(b) => updateBlock(block.id, b)}
                            onDelete={() => deleteBlock(block.id)}
                            onOpenAssetPicker={() => {
                              setAssetPickerBlockId(block.id);
                              setAssetPickerOpen(true);
                            }}
                          />
                        </SortableBlockRow>
                      </Fragment>
                    ))}
                    <BlockInsertRow onInsert={(t) => insertBlockAt(formPayload.blocks.length, t)} />
                  </SortableContext>
                </DndContext>
              )}
              {/* Add block */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Add block at end
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72 overflow-y-auto">
                  <AddBlockMenuItems onPick={(t) => insertBlockAt(formPayload.blocks.length, t)} />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            /* Legacy flat-field form */
            <>
              <div className="space-y-2">
                <Label>Eyebrow</Label>
                <Input
                  value={formPayload.eyebrow}
                  onChange={e => onFormPayloadChange({ ...formPayload, eyebrow: e.target.value })}
                  placeholder="Short label above the headline (optional)"
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
          <EmailTemplatePickerDialog
            open={templatePickerOpen}
            onOpenChange={setTemplatePickerOpen}
            onSelect={applyLoadedTemplate}
          />
        </TabsContent>

          {/* Code mode */}
          <TabsContent value="raw_html" className="space-y-2 mt-0">
            <Textarea
              ref={codeTextareaRef}
              value={htmlBody}
              onChange={e => onHtmlBodyChange(e.target.value)}
              placeholder="<!DOCTYPE html>…"
              rows={14}
              className="font-mono text-sm min-h-[280px]"
            />
          </TabsContent>
        </div>
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
