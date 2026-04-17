import { stripEmailScripts, htmlHasAssignableEmailRegions } from '@/lib/email/email-utils';

export type EmailMappingSlot = 'eyebrow' | 'headline' | 'subheadline' | 'body' | 'cta' | 'signoff';

export interface RegionCandidate {
  id: string;
  tagName: string;
  textPreview: string;
  wordCount: number;
  hasMergeToken: boolean;
  confidence: 'high' | 'medium' | 'low';
  suggestedSlot: EmailMappingSlot | 'footer' | null;
}

/** Slot picks for region review. `body` may list multiple `data-email-cand` ids merged into one region. */
export type EmailRegionAssignments = {
  eyebrow?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  body?: string | string[] | null;
  cta?: string | null;
  signoff?: string | null;
};

export type DefaultEmailRegionSlots = Partial<Record<Exclude<EmailMappingSlot, 'body'>, string>> & {
  body?: string | string[];
};

export interface PrepareRegionMappingResult {
  taggedHtml: string;
  candidates: RegionCandidate[];
  defaultSlots: DefaultEmailRegionSlots;
  defaultLocked: string[];
}

const FOOTER_HINT = /unsubscribe|preferences|©|all rights reserved|privacy policy|you're receiving this/i;

function textLen(el: Element): number {
  return (el.textContent || '').replace(/\s+/g, ' ').trim().length;
}

function isFooterish(el: Element): boolean {
  const t = (el.textContent || '').trim();
  return FOOTER_HINT.test(t) || (t.length < 120 && /unsubscribe/i.test(t));
}

function looksLikeCtaAnchor(el: Element): boolean {
  if (el.tagName.toLowerCase() !== 'a') return false;
  const t = (el.textContent || '').trim();
  const style = ((el as HTMLElement).getAttribute('style') || '').toLowerCase();
  const href = (el as HTMLAnchorElement).getAttribute('href') || '';
  if (!href || href === '#') return false;
  const btnish =
    style.includes('background') ||
    style.includes('border-radius') ||
    style.includes('line-height:44') ||
    style.includes('line-height: 44') ||
    el.className.toLowerCase().includes('button');
  return btnish || (t.length > 0 && t.length < 48);
}

/**
 * Tag candidate nodes and infer default slot assignments for HTML without `data-region`.
 */
export function prepareEmailRegionMapping(html: string): PrepareRegionMappingResult {
  const clean = stripEmailScripts(html);
  if (!clean.trim() || htmlHasAssignableEmailRegions(clean) || typeof DOMParser === 'undefined') {
    return { taggedHtml: clean, candidates: [], defaultSlots: {}, defaultLocked: [] };
  }

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const body = doc.body;
  if (!body) return { taggedHtml: clean, candidates: [], defaultSlots: {}, defaultLocked: [] };

  const tags = new Set(['h1', 'h2', 'h3', 'p', 'td', 'a', 'button', 'ul', 'ol']);
  const candidates: RegionCandidate[] = [];
  let seq = 0;

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node: Node) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (!tags.has(tag)) return NodeFilter.FILTER_SKIP;
      if (['ul', 'ol'].includes(tag)) {
        const list = el as HTMLElement;
        const liCount = Array.from(list.children).filter(ch => ch.tagName.toLowerCase() === 'li').length;
        if (liCount < 2 && textLen(el) < 20) return NodeFilter.FILTER_SKIP;
      }
      if (textLen(el) < 8) return NodeFilter.FILTER_SKIP;
      if (tag === 'td' && el.querySelector('p,h1,h2,h3')) return NodeFilter.FILTER_SKIP;
      if (tag === 'td' && textLen(el) > 2500) return NodeFilter.FILTER_SKIP;
      if (tag === 'td' && el.querySelector('a') && el.querySelector('a')?.textContent?.trim() === el.textContent?.trim()) {
        return NodeFilter.FILTER_SKIP;
      }
      if (el.closest('[style*="display:none"]') || el.closest('[style*="display: none"]')) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let n: Node | null = walker.nextNode();
  while (n) {
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    const words = (el.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const preview = txt.length > 120 ? `${txt.slice(0, 117)}…` : txt;
    const hasMerge = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test((el as HTMLElement).innerHTML || '');
    const id = `cand-${seq++}`;
    el.setAttribute('data-email-cand', id);

    let suggested: RegionCandidate['suggestedSlot'] = null;
    let confidence: RegionCandidate['confidence'] = 'low';

    const dr = (el.getAttribute('data-region') || '').trim().toLowerCase();
    if (dr === 'eyebrow') {
      suggested = 'eyebrow';
      confidence = 'high';
    } else if (dr === 'headline') {
      suggested = 'headline';
      confidence = 'high';
    } else if (dr === 'subheadline') {
      suggested = 'subheadline';
      confidence = 'high';
    } else if (dr === 'body') {
      suggested = 'body';
      confidence = 'high';
    } else if (dr === 'signoff') {
      suggested = 'signoff';
      confidence = 'high';
    } else if (dr === 'cta-url' || dr === 'cta-label') {
      suggested = 'cta';
      confidence = 'high';
    } else if (dr === 'footer') {
      suggested = 'footer';
      confidence = 'high';
    } else if (isFooterish(el)) {
      suggested = 'footer';
      confidence = 'medium';
    } else if (tag === 'a' && looksLikeCtaAnchor(el)) {
      suggested = 'cta';
      confidence = 'high';
    } else if (tag === 'h1') {
      suggested = 'headline';
      confidence = 'high';
    } else if (tag === 'h2' || tag === 'h3') {
      suggested = 'subheadline';
      confidence = 'medium';
    } else if (tag === 'ul' || tag === 'ol') {
      suggested = 'body';
      confidence = 'high';
    } else if ((tag === 'p' || tag === 'td') && words > 25) {
      suggested = 'body';
      confidence = txt.length > 180 ? 'high' : 'medium';
    } else if (tag === 'p' && /^(best|thanks|sincerely|cheers|warmly)\b/i.test(txt)) {
      suggested = 'signoff';
      confidence = 'medium';
    } else if (tag === 'p' && words <= 25 && candidates.filter(c => c.suggestedSlot === 'headline').length > 0) {
      suggested = 'eyebrow';
      confidence = 'low';
    } else if (hasMerge && !suggested && tag !== 'a') {
      suggested = 'body';
      confidence = 'medium';
    }

    candidates.push({
      id,
      tagName: tag,
      textPreview: preview,
      wordCount: words,
      hasMergeToken: hasMerge,
      confidence,
      suggestedSlot: suggested,
    });
    n = walker.nextNode();
  }

  const taggedHtml = doc.documentElement?.outerHTML?.includes('<html')
    ? `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
    : clean;

  const defaultSlots: DefaultEmailRegionSlots = {};
  const used = new Set<string>();
  const slotOrderNoBody: Exclude<EmailMappingSlot, 'body'>[] = ['eyebrow', 'headline', 'subheadline', 'cta', 'signoff'];
  for (const slot of slotOrderNoBody) {
    const match = candidates.find(c => c.suggestedSlot === slot && !used.has(c.id));
    if (match) {
      defaultSlots[slot] = match.id;
      used.add(match.id);
    }
  }
  const defaultLocked = candidates.filter(c => c.suggestedSlot === 'footer').map(c => c.id);

  const hIdx = defaultSlots.headline != null ? candidates.findIndex(c => c.id === defaultSlots.headline) : -1;
  const cIdx = defaultSlots.cta != null ? candidates.findIndex(c => c.id === defaultSlots.cta) : -1;
  const lo = hIdx >= 0 ? hIdx + 1 : 0;
  const hi = cIdx >= 0 ? cIdx : candidates.length;
  const bodyCluster: string[] = [];
  const maxBodyBlocks = 6;
  for (let i = lo; i < hi; i++) {
    const c = candidates[i];
    if (used.has(c.id) || defaultLocked.includes(c.id)) continue;
    if (c.suggestedSlot === 'footer') continue;
    const qualifies =
      c.suggestedSlot === 'body' ||
      (c.suggestedSlot === null && ['p', 'ul', 'ol'].includes(c.tagName) && c.wordCount >= 6);
    if (!qualifies) continue;
    bodyCluster.push(c.id);
    if (bodyCluster.length >= maxBodyBlocks) break;
  }
  if (bodyCluster.length === 0) {
    const m = candidates.find(c => c.suggestedSlot === 'body' && !used.has(c.id));
    if (m) bodyCluster.push(m.id);
  }
  if (bodyCluster.length > 0) {
    defaultSlots.body = bodyCluster.length === 1 ? bodyCluster[0] : bodyCluster;
    bodyCluster.forEach(id => used.add(id));
  }

  return { taggedHtml, candidates, defaultSlots, defaultLocked };
}

function normalizeBodyCandIds(body: string | string[] | null | undefined): string[] {
  if (body == null) return [];
  const arr = Array.isArray(body) ? body : [body];
  return arr.map(s => String(s).trim()).filter(Boolean);
}

function sortElementsDocumentOrder(els: Element[]): Element[] {
  return [...els].sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

/** Keep topmost nodes when one selected element contains another. */
function maximalByContainment(els: Element[]): Element[] {
  return els.filter(a => !els.some(b => b !== a && b.contains(a)));
}

function applyBodyRegionFromCandidates(doc: Document, candIds: string[], ctaId: string | undefined): void {
  const ids = candIds.filter(id => id && id !== ctaId?.trim());
  const resolved = ids.map(id => doc.querySelector(`[data-email-cand="${id}"]`)).filter(Boolean) as Element[];
  if (resolved.length === 0) return;
  const maximal = sortElementsDocumentOrder(maximalByContainment(resolved));
  if (maximal.length === 1) {
    maximal[0].setAttribute('data-region', 'body');
    maximal[0].removeAttribute('data-email-cand');
    return;
  }
  const first = maximal[0];
  const parent = first.parentElement;
  if (!parent) return;
  const wrapper = doc.createElement('div');
  wrapper.setAttribute('data-region', 'body');
  wrapper.setAttribute('style', 'margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#374151;');
  parent.insertBefore(wrapper, first);
  for (const el of maximal) {
    wrapper.appendChild(el);
  }
  wrapper.querySelectorAll('[data-email-cand]').forEach(n => n.removeAttribute('data-email-cand'));
}

/**
 * Apply `data-region` / locked markers from review choices. Removes `data-email-cand` when done.
 * `body` may be several candidate ids; they are merged into one `data-region="body"` wrapper when needed.
 */
export function applyEmailRegionAssignments(
  taggedHtml: string,
  assignments: EmailRegionAssignments,
  lockedCandIds: string[],
): string {
  if (!taggedHtml.trim() || typeof DOMParser === 'undefined') return taggedHtml;

  const doc = new DOMParser().parseFromString(taggedHtml, 'text/html');
  const body = doc.body;
  if (!body) return taggedHtml;

  const stamp = (candId: string, fn: (el: Element) => void) => {
    const el = doc.querySelector(`[data-email-cand="${candId}"]`);
    if (el) fn(el);
  };

  (lockedCandIds || []).forEach(id => {
    stamp(id, el => {
      el.setAttribute('data-email-locked', 'true');
      el.removeAttribute('data-email-cand');
    });
  });

  const ctaId = assignments.cta?.trim();
  if (ctaId) {
    stamp(ctaId, el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'a') {
        const a = el as HTMLAnchorElement;
        a.setAttribute('data-region', 'cta-url');
        if (!a.querySelector('[data-region="cta-label"]')) {
          const label = (a.textContent || '').trim();
          a.textContent = '';
          const span = doc.createElement('span');
          span.setAttribute('data-region', 'cta-label');
          span.textContent = label;
          a.appendChild(span);
        }
      }
      el.removeAttribute('data-email-cand');
    });
  }

  const simpleSlots: Array<[keyof EmailRegionAssignments, string]> = [
    ['eyebrow', 'eyebrow'],
    ['headline', 'headline'],
    ['subheadline', 'subheadline'],
    ['signoff', 'signoff'],
  ];

  for (const [slot, regionAttr] of simpleSlots) {
    const raw = assignments[slot];
    const cid = typeof raw === 'string' ? raw.trim() : '';
    if (!cid || cid === ctaId) continue;
    stamp(cid, el => {
      el.setAttribute('data-region', regionAttr);
      el.removeAttribute('data-email-cand');
    });
  }

  const bodyIds = normalizeBodyCandIds(assignments.body);
  if (bodyIds.length > 0) {
    applyBodyRegionFromCandidates(doc, bodyIds, ctaId);
  }

  body.querySelectorAll('[data-email-cand]').forEach(el => {
    el.removeAttribute('data-email-cand');
  });

  const out = doc.documentElement?.outerHTML ?? taggedHtml;
  return out.includes('<!DOCTYPE') ? out : `<!DOCTYPE html>${out}`;
}
