'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Monitor, Smartphone, Maximize2 } from 'lucide-react';
import { AnnouncementLayoutPreview } from './AnnouncementLayoutPreview';
import type { AnnouncementForm, ComposeKind } from '@/types/email-types';
import { getEmailEditorPreviewHtml } from '@/lib/email/email-utils';
import { cn } from '@/lib/utils';

export interface EmailPreviewPaneProps {
  composeKind: ComposeKind;
  formPayload: AnnouncementForm;
  htmlBody: string;
  siteLabel: string;
  subject: string;
  className?: string;
}

export function EmailPreviewPane({
  composeKind,
  formPayload,
  htmlBody,
  siteLabel,
  subject,
  className,
}: EmailPreviewPaneProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const previewHtml = useMemo(
    () => getEmailEditorPreviewHtml(composeKind, formPayload, htmlBody, siteLabel),
    [composeKind, formPayload, htmlBody, siteLabel],
  );

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Live preview</p>
          {subject.trim() ? (
            <p className="text-[11px] text-muted-foreground truncate" title={subject}>
              Subject: {subject}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">No subject yet</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline" title="Preview frame width (approximate)">
            {viewport === 'mobile' ? '390 px' : '600 px'}
          </span>
          <Button
            type="button"
            variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewport('desktop')}
            title="Desktop preview (~600px wide)"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewport('mobile')}
            title="Mobile preview (~390px wide)"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFullscreenOpen(true)}
            title="Full screen preview"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-muted/15 p-2">
        {composeKind === 'announcement_form' ? (
          <AnnouncementLayoutPreview form={formPayload} viewport={viewport} siteLabel={siteLabel} />
        ) : (
          <div className="flex justify-center w-full">
            <div
              className="overflow-hidden rounded border bg-background shadow-sm"
              style={{ width: viewport === 'mobile' ? 390 : 600, maxWidth: '100%' }}
            >
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0 bg-white"
                style={{ height: 'min(480px, 60vh)' }}
                title="Email preview"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0 space-y-0">
            <DialogTitle className="text-sm">Email preview</DialogTitle>
            <p className="text-[11px] text-muted-foreground font-normal pt-1">
              Full HTML as it will be structured for sending (exact rendering varies by inbox).
            </p>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml}
            className="flex-1 w-full min-h-0 border-0 bg-white"
            title="Email preview full screen"
            sandbox="allow-same-origin allow-scripts"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
