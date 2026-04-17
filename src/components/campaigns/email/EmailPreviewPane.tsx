'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';
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
        <div className="flex gap-0.5 shrink-0">
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
    </div>
  );
}
