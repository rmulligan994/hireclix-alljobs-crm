import { stripEmailScripts } from '@/lib/email/email-utils';

export interface EmailHtmlImageRow {
  index: number;
  src: string;
  alt: string;
  /** Raw width attribute if present */
  widthAttr: string | null;
  isDataUrl: boolean;
  hasSrcset: boolean;
}

function serializeHtmlDocument(doc: Document, fallback: string): string {
  const serialized = doc.documentElement?.outerHTML ?? fallback;
  return serialized.includes('<!DOCTYPE') ? serialized : `<!DOCTYPE html>${serialized}`;
}

/**
 * List `<img>` nodes in document order (for stable index-based patching).
 * SSR-safe: returns [] when `DOMParser` is unavailable.
 */
export function listImagesFromEmailHtml(html: string): EmailHtmlImageRow[] {
  const clean = stripEmailScripts(html);
  if (!clean.trim() || typeof DOMParser === 'undefined') return [];

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img'));
  return imgs.map((img, index) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    const widthAttr = img.getAttribute('width');
    return {
      index,
      src,
      alt,
      widthAttr,
      isDataUrl: src.trim().toLowerCase().startsWith('data:'),
      hasSrcset: img.hasAttribute('srcset'),
    };
  });
}

/** True when HTML uses `<picture>` or any `srcset` (v1 editor only patches plain `src`). */
export function htmlUsesAdvancedImageMarkup(html: string): boolean {
  const clean = stripEmailScripts(html);
  if (!clean.trim() || typeof DOMParser === 'undefined') return false;
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  if (doc.querySelector('picture')) return true;
  return Array.from(doc.querySelectorAll('img[srcset]')).length > 0;
}

export type PatchEmailHtmlImageInput = {
  src?: string;
  alt?: string;
  /** Set numeric width attribute, or `null` to remove */
  width?: number | null;
};

/**
 * Update the n-th `<img>` in the HTML string. Returns updated HTML, or `null` if index is invalid or DOM parse fails.
 */
export function patchEmailHtmlImage(html: string, index: number, patch: PatchEmailHtmlImageInput): string | null {
  const clean = stripEmailScripts(html);
  if (!clean.trim() || typeof DOMParser === 'undefined') return null;

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img'));
  const img = imgs[index] as HTMLImageElement | undefined;
  if (!img) return null;

  if (patch.src !== undefined) img.setAttribute('src', patch.src);
  if (patch.alt !== undefined) img.setAttribute('alt', patch.alt);
  if (patch.width !== undefined) {
    if (patch.width === null) img.removeAttribute('width');
    else img.setAttribute('width', String(patch.width));
  }

  return serializeHtmlDocument(doc, clean);
}
