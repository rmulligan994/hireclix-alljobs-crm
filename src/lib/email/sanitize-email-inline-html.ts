import sanitizeHtml from 'sanitize-html';

/** Allowed inline markup for email body fragments (tables + clients vary; inline styles on spans are safest). */
export function sanitizeEmailInlineHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  return sanitizeHtml(trimmed, {
    allowedTags: ['b', 'strong', 'i', 'em', 'u', 'br', 'span', 'a'],
    allowedAttributes: {
      a: ['href', 'title'],
      span: ['style'],
    },
    allowedStyles: {
      span: {
        color: [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,
          /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/,
        ],
        // Chrome / execCommand often emit bold/italic/underline as styled spans, not <b>/<i>
        'font-weight': [/^\s*bold\s*$/i, /^\s*normal\s*$/i, /^\s*[1-9]00\s*$/],
        'font-style': [/^\s*italic\s*$/i, /^\s*normal\s*$/i],
        'text-decoration': [/^\s*underline\s*$/i, /^\s*none\s*$/i],
      },
    },
    transformTags: {
      a: (_tagName, attribs): { tagName: string; attribs: Record<string, string> } => {
        const href = attribs.href || '';
        const safe =
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href === '#' ||
          href.startsWith('{{');
        if (!safe) {
          return { tagName: 'span', attribs: {} };
        }
        return { tagName: 'a', attribs: { href } };
      },
    },
  });
}

/** Plain text for merge-tag extraction and fallbacks. */
export function stripHtmlToPlain(html: string): string {
  if (!html.trim()) return '';
  if (typeof document !== 'undefined') {
    const d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').replace(/\u00a0/g, ' ').trim();
  }
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
