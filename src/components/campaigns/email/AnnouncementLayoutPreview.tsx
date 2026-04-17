import type { AnnouncementForm, ContentBlock } from '@/types/email-types';

interface AnnouncementLayoutPreviewProps {
  form: AnnouncementForm;
  viewport: 'desktop' | 'mobile';
  siteLabel?: string;
}

function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      if (block.level === 1) return <h1 className="text-xl font-bold text-foreground mb-1">{block.text}</h1>;
      if (block.level === 2) return <h2 className="text-lg font-semibold text-foreground mb-1">{block.text}</h2>;
      return <h3 className="text-base font-semibold text-foreground mb-1">{block.text}</h3>;
    case 'text':
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

export function AnnouncementLayoutPreview({ form, viewport, siteLabel = 'Your Company' }: AnnouncementLayoutPreviewProps) {
  const maxW = viewport === 'mobile' ? 375 : '100%';

  // Block-based rendering
  if (form.useBlocks && form.blocks.length > 0) {
    return (
      <div className="border rounded-md overflow-auto bg-muted/30" style={{ maxWidth: maxW }}>
        <div className="p-6 max-w-[560px] mx-auto bg-background rounded" style={{ fontFamily: 'Arial, sans-serif' }}>
          <p className="text-xs text-muted-foreground mb-3">{siteLabel}</p>
          {form.blocks.map((block) => (
            <BlockPreview key={block.id} block={block} />
          ))}
          <hr className="my-4 border-border" />
          <p className="text-xs text-muted-foreground"><a href="#" className="text-muted-foreground underline">Unsubscribe</a></p>
        </div>
      </div>
    );
  }

  // Legacy flat-field rendering
  return (
    <div className="border rounded-md overflow-auto bg-muted/30" style={{ maxWidth: maxW }}>
      <div className="p-6 max-w-[560px] mx-auto bg-background rounded" style={{ fontFamily: 'Arial, sans-serif' }}>
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
      </div>
    </div>
  );
}
