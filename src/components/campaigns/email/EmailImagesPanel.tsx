import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FolderOpen, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listImagesFromEmailHtml, patchEmailHtmlImage, htmlUsesAdvancedImageMarkup } from '@/lib/email/email-image-utils';
import { stripEmailScripts } from '@/lib/email/email-utils';
import { WebflowAssetPicker, type WebflowAsset } from './WebflowAssetPicker';

export interface EmailImagesPanelProps {
  htmlBody: string;
  onHtmlBodyChange: (html: string) => void;
  siteId?: string;
  className?: string;
}

export function EmailImagesPanel({ htmlBody, onHtmlBodyChange, siteId = 's1', className }: EmailImagesPanelProps) {
  const clean = useMemo(() => stripEmailScripts(htmlBody), [htmlBody]);
  const images = useMemo(() => listImagesFromEmailHtml(htmlBody), [htmlBody]);
  const hasAdvancedMarkup = useMemo(() => htmlUsesAdvancedImageMarkup(htmlBody), [htmlBody]);
  const [open, setOpen] = useState(true);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerIndex, setAssetPickerIndex] = useState<number | null>(null);

  const applyPatch = (index: number, patch: Parameters<typeof patchEmailHtmlImage>[2]) => {
    const next = patchEmailHtmlImage(htmlBody, index, patch);
    if (next == null) return;
    onHtmlBodyChange(next);
  };

  const onAssetSelect = (asset: WebflowAsset) => {
    if (assetPickerIndex == null) return;
    const w = asset.dimensions ? Math.min(asset.dimensions.width, 600) : undefined;
    applyPatch(assetPickerIndex, {
      src: asset.url,
      alt: asset.name || images[assetPickerIndex]?.alt || '',
      width: w,
    });
    setAssetPickerOpen(false);
    setAssetPickerIndex(null);
  };

  if (!clean.trim() || images.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between text-xs">
            <span>Images in this email ({images.length})</span>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2 rounded-md border bg-muted/15 p-3">
          <p className="text-[11px] text-muted-foreground flex gap-1.5 items-start">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Changes update the HTML directly. Very large <span className="font-mono">data:</span> URLs may not render in all inboxes—prefer hosted
              images or assets.
            </span>
          </p>
          {hasAdvancedMarkup && (
            <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5">
              This template uses <span className="font-mono">srcset</span> or <span className="font-mono">&lt;picture&gt;</span>. Those sources are
              not edited here—use Code mode for those.
            </p>
          )}
          <div className="space-y-4 max-h-[min(360px,50vh)] overflow-y-auto pr-1">
            {images.map(row => (
              <div key={row.index} className="rounded-md border bg-background/80 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Image {row.index + 1}</span>
                  {row.hasSrcset && <span className="text-[10px] text-muted-foreground font-mono">srcset</span>}
                </div>
                <div className="flex gap-3">
                  <div className="h-16 w-24 shrink-0 rounded border bg-muted/40 overflow-hidden flex items-center justify-center">
                    {row.src && !row.isDataUrl ? (
                      <img src={row.src} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground px-1 text-center">Preview</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Image URL</Label>
                      <Input
                        className="h-8 text-xs font-mono"
                        value={row.src}
                        disabled={row.hasSrcset}
                        onChange={e => applyPatch(row.index, { src: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="space-y-1 flex-1 min-w-[120px]">
                        <Label className="text-[10px] text-muted-foreground">Alt text</Label>
                        <Input
                          className="h-8 text-xs"
                          value={row.alt}
                          disabled={row.hasSrcset}
                          onChange={e => applyPatch(row.index, { alt: e.target.value })}
                          placeholder="Describe the image"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        disabled={row.hasSrcset}
                        onClick={() => {
                          setAssetPickerIndex(row.index);
                          setAssetPickerOpen(true);
                        }}
                      >
                        <FolderOpen className="h-3.5 w-3.5 mr-1" />
                        Assets
                      </Button>
                    </div>
                    <div className="space-y-1 max-w-[120px]">
                      <Label className="text-[10px] text-muted-foreground">Width (px)</Label>
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={row.widthAttr ?? ''}
                        disabled={row.hasSrcset}
                        placeholder="—"
                        min={1}
                        max={1200}
                        onChange={e => {
                          const v = e.target.value.trim();
                          if (v === '') applyPatch(row.index, { width: null });
                          else {
                            const n = parseInt(v, 10);
                            if (!Number.isNaN(n)) applyPatch(row.index, { width: n });
                          }
                        }}
                      />
                    </div>
                    {row.isDataUrl && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">Inline data URL — consider replacing with a hosted image.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <WebflowAssetPicker open={assetPickerOpen} onOpenChange={setAssetPickerOpen} onSelect={onAssetSelect} siteId={siteId} />
    </div>
  );
}
