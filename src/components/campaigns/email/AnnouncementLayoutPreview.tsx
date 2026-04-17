import type { ReactNode } from 'react';
import type { AnnouncementForm, ContentBlock } from '@/types/email-types';
import { sanitizeEmailInlineHtml } from '@/lib/email/sanitize-email-inline-html';

interface AnnouncementLayoutPreviewProps {
  form: AnnouncementForm;
  viewport: 'desktop' | 'mobile';
  siteLabel?: string;
}

function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading': {
      const cls = block.level === 1 ? 'text-xl' : block.level === 2 ? 'text-lg' : 'text-base';
      if (block.textHtml?.trim()) {
        return (
          <div
            className={`${cls} text-foreground mb-1 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_a]:underline [&_a]:text-primary`}
            dangerouslySetInnerHTML={{ __html: sanitizeEmailInlineHtml(block.textHtml) }}
          />
        );
      }
      if (block.level === 1) return <h1 className="text-xl font-bold text-foreground mb-1">{block.text}</h1>;
      if (block.level === 2) return <h2 className="text-lg font-semibold text-foreground mb-1">{block.text}</h2>;
      return <h3 className="text-base font-semibold text-foreground mb-1">{block.text}</h3>;
    }
    case 'text':
      if (block.contentHtml?.trim()) {
        return (
          <div
            className="text-sm text-foreground leading-relaxed mb-3 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_a]:underline [&_a]:text-primary"
            dangerouslySetInnerHTML={{ __html: sanitizeEmailInlineHtml(block.contentHtml) }}
          />
        );
      }
      return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-3">{block.content}</p>;
    case 'image':
      return (
        <div className="mb-3">
          <img
            src={block.url}
            alt={block.alt}
            className="max-w-full h-auto rounded"
            style={{ width: block.width ? `${block.width}px` : '100%', maxWidth: '100%' }}
          />
        </div>
      );
    case 'button':
      return (
        <a href={block.url || '#'} className="inline-block bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold no-underline mb-4">
          {block.label}
        </a>
      );
    case 'divider':
      return <hr className="my-3 border-border" />;
    case 'spacer':
      return <div style={{ height: block.height }} />;
    default:
      return null;
  }
}

/** Matches common ~600px desktop and ~390px mobile email preview widths. */
const PREVIEW_FRAME_PX = { desktop: 600, mobile: 390 } as const;

export function AnnouncementLayoutPreview({ form, viewport, siteLabel = 'Your Company' }: AnnouncementLayoutPreviewProps) {
  const frameW = viewport === 'mobile' ? PREVIEW_FRAME_PX.mobile : PREVIEW_FRAME_PX.desktop;

  const frame = (children: ReactNode) => (
    <div className="flex justify-center w-full">
      <div
        className="border rounded-md overflow-auto bg-muted/30 shadow-sm w-full relative"
        style={{ maxWidth: frameW }}
      >
        <span className="absolute left-2 top-2 z-10 rounded bg-muted/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60">
          {viewport === 'mobile' ? '390 px' : '600 px'} · approx
        </span>
        <div className="p-6 mx-auto bg-background rounded min-h-[120px] pt-10" style={{ fontFamily: 'Arial, sans-serif' }}>
          {children}
        </div>
      </div>
    </div>
  );

  // Block-based rendering (empty list still uses block mode)
  if (form.useBlocks) {
    return frame(
      <>
        <p className="text-xs text-muted-foreground mb-3">{siteLabel}</p>
        {form.blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">Add blocks to see content here.</p>
        ) : (
          form.blocks.map((block) => <BlockPreview key={block.id} block={block} />)
        )}
        <hr className="my-4 border-border" />
        <p className="text-xs text-muted-foreground"><a href="#" className="text-muted-foreground underline">Unsubscribe</a></p>
      </>,
    );
  }

  // Legacy flat-field rendering
  return frame(
    <>
        <p className="text-xs text-muted-foreground mb-3">{siteLabel}</p>
        <p className="text-sm text-foreground mb-2">Hi {'{{firstName}}'},</p>
        {form.headline && <h2 className="text-xl font-bold text-foreground mb-1">{form.headline}</h2>}
        {form.subhead && <p className="text-sm text-muted-foreground mb-3">{form.subhead}</p>}
        {form.message && <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-4">{form.message}</p>}
        {form.buttonLabel && (
          <a href={form.buttonUrl || '#'} className="inline-block bg-primary text-primary-foreground px-5 py-2 rounded text-sm font-semibold no-underline mb-4">
            {form.buttonLabel}
          </a>
        )}
        {form.signOff && <p className="text-sm text-muted-foreground mt-4">{form.signOff}</p>}
        <hr className="my-4 border-border" />
        <p className="text-xs text-muted-foreground"><a href="#" className="text-muted-foreground underline">Unsubscribe</a></p>
    </>,
  );
}
