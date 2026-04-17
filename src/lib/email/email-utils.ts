import type { AnnouncementForm, ComposeKind, ContentBlock, BrandSettings } from '@/types/email-types';

let _blockIdCounter = 0;
export function genBlockId(): string {
  return `blk-${Date.now()}-${++_blockIdCounter}`;
}

/** Remove all <script> tags from HTML string */
export function stripEmailScripts(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/** Insert text at cursor position in a textarea */
export function insertIntoTextarea(
  el: HTMLTextAreaElement,
  value: string,
  currentValue: string,
  onChange: (newValue: string) => void
): void {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + value.length;
    el.focus();
  });
}

/** Insert text at cursor in a single-line input */
export function insertIntoInput(
  el: HTMLInputElement,
  value: string,
  currentValue: string,
  onChange: (newValue: string) => void
): void {
  const start = el.selectionStart ?? currentValue.length;
  const end = el.selectionEnd ?? currentValue.length;
  const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + value.length;
    el.focus();
  });
}

/** Replace `currentValue[from:to]` and restore focus with caret after the insertion. */
export function replaceRangeInInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  currentValue: string,
  from: number,
  to: number,
  replacement: string,
  onChange: (newValue: string) => void,
): void {
  const newValue = currentValue.slice(0, from) + replacement + currentValue.slice(to);
  onChange(newValue);
  requestAnimationFrame(() => {
    const pos = from + replacement.length;
    el.selectionStart = el.selectionEnd = pos;
    el.focus();
  });
}

/** Extract unique merge keys like `job_title` from `{{job_title}}` across strings */
export function extractMergeVars(...sources: string[]): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const seen = new Set<string>();
  for (const s of sources) {
    if (!s) continue;
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, 'g');
    while ((m = r.exec(s)) !== null) {
      seen.add(m[1]);
    }
  }
  return [...seen];
}

/** Replace `{{key}}` when `map[key]` is non-empty; otherwise leave token visible */
export function applyVariableMap(html: string, map: Record<string, string | undefined>): string {
  let out = html;
  for (const [key, val] of Object.entries(map)) {
    if (val == null || String(val).trim() === '') continue;
    const escaped = val.replace(/\\/g, '\\\\').replace(/\$/g, '$$');
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), escaped);
  }
  return out;
}

/** Escape text for safe HTML insertion (recruiter copy). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Replace only `{{merge_key}}` tokens when the map has a non-empty value.
 * Never substitutes literal recruiter text — only explicit merge tokens.
 */
export function resolveMergeTagsInString(text: string, map: Record<string, string | undefined>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, key: string) => {
    const v = map[key];
    if (v != null && String(v).trim() !== '') return String(v);
    return full;
  });
}

/** Sample CRM values for preview when the user has not overridden a token. */
export const CRM_PREVIEW_DEFAULTS: Record<string, string> = {
  job_title: 'Senior Product Designer',
  department: 'Design Team',
  location: 'Remote',
  employment_type: 'Full-time',
  member_name: 'Jane Doe',
  company_name: 'Your Company',
  site_name: 'Your Company',
  apply_url: 'https://example.com/apply',
  unsubscribe_url: '#unsubscribe',
  event_name: 'Spring Career Fair',
  event_date: 'Thursday, May 8',
  event_time: '5:00 PM ET',
  event_location: 'Virtual + NYC hub',
  event_format: 'Hybrid',
  rsvp_url: 'https://example.com/rsvp',
  careers_url: 'https://example.com/careers',
  culture_url: 'https://example.com/culture',
  blog_url: 'https://example.com/blog',
  newsletter_month: 'April',
  newsletter_year: '2026',
  news_headline: 'What’s new this month',
  news_summary: 'Highlights from across the company.',
  role_1_title: 'Senior Engineer',
  role_1_location: 'Remote · US',
  role_1_url: 'https://example.com/jobs/1',
  role_2_title: 'Product Designer',
  role_2_location: 'Hybrid · NYC',
  role_2_url: 'https://example.com/jobs/2',
  role_3_title: 'Recruiting Coordinator',
  role_3_location: 'On-site · Austin',
  role_3_url: 'https://example.com/jobs/3',
  interview_date: 'Tuesday, April 22',
  interview_time: '2:00 PM',
  timezone: 'ET',
  interviewer_name: 'Alex Morgan',
  interviewer_title: 'Engineering Manager',
  interview_format: 'Video (Google Meet)',
  interview_link: 'https://example.com/meet',
  job_url: 'https://example.com/job',
  reschedule_url: 'https://example.com/reschedule',
  referral_bonus: '$2,500',
  referral_url: 'https://example.com/refer',
  highlight_1_title: 'New product launch',
  highlight_1_description: 'We shipped our biggest release yet.',
  highlight_2_title: 'Team growth',
  highlight_2_description: 'We welcomed 40 new teammates.',
  manager_name: 'Jordan Lee',
  manager_title: 'Director of Engineering',
  calendar_url: 'https://example.com/book',
  employee_name: 'Sam Rivera',
  employee_title: 'Staff Engineer',
  employee_quote: 'The problems we solve here actually matter.',
  skill_area: 'distributed systems',
  recruiter_name: 'Jamie Chen',
  recruiter_email: 'recruiter@example.com',
  recruiter_title: 'Technical Recruiter',
  interview_location: 'Remote',
  event_url: 'https://example.com/event',
  event_name_short: 'D&I Roundtable',
  // Clarity send pipeline tokens (align with supabase/functions/send-campaign-email replaceMergeTags)
  firstName: 'Jane',
  lastName: 'Doe',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  company: 'Acme Corp',
  title: 'Engineer',
  skills: 'React, TypeScript',
  source: 'LinkedIn',
  linkedinUrl: 'https://linkedin.com/in/example',
  campaignName: 'Sample Campaign',
  currentDate: '4/16/2026',
  currentTime: '9:00:00 AM',
  senderName: 'Alex Recruiter',
  senderTitle: 'Technical Recruiter',
  senderCompany: 'Your Company',
  senderBrand: 'Your Brand',
  senderEmail: 'recruiter@example.com',
  senderLinkedinUrl: 'https://linkedin.com/in/recruiter',
  jobTitle: 'Senior Engineer',
  jobDepartment: 'Engineering',
  jobLocation: 'Remote',
  jobType: 'Full-time',
  jobDescription: 'We are hiring...',
  jobUrl: 'https://example.com/job',
  unsubscribeLink: '#unsubscribe',
  viewInBrowserLink: '#',
};

/**
 * CRM merge map for preview only. Recruiter form fields (headline, body, …) must never
 * be written into unrelated merge keys (e.g. headline must not set job_title).
 */
export function buildCrmMergePreviewMap(
  brand: BrandSettings,
  variableValues: Record<string, string>,
  /** When the recruiter entered a plain URL (no tokens), use it as apply_url fallback. */
  literalButtonUrl?: string,
): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {
    ...CRM_PREVIEW_DEFAULTS,
    ...variableValues,
    company_name: variableValues.company_name?.trim() || brand.companyName || CRM_PREVIEW_DEFAULTS.company_name,
    site_name: variableValues.site_name?.trim() || brand.companyName || CRM_PREVIEW_DEFAULTS.site_name,
    member_name: variableValues.member_name?.trim() || CRM_PREVIEW_DEFAULTS.member_name,
    unsubscribe_url: variableValues.unsubscribe_url?.trim() || CRM_PREVIEW_DEFAULTS.unsubscribe_url,
    senderCompany: variableValues.senderCompany?.trim() || brand.companyName || CRM_PREVIEW_DEFAULTS.senderCompany,
    unsubscribeLink:
      variableValues.unsubscribeLink?.trim() || variableValues.unsubscribe_url?.trim() || CRM_PREVIEW_DEFAULTS.unsubscribeLink,
  };
  const btn = literalButtonUrl?.trim() ?? '';
  if (btn && !/\{\{/.test(btn)) {
    map.apply_url = variableValues.apply_url?.trim() || btn;
  }
  return map;
}

/** HTML preview in the code editor tab — replaces {{tokens}} with sample data (Clarity + legacy keys). */
export function applySampleMerge(html: string, _ignored?: Record<string, unknown>): string {
  return resolveMergeTagsInString(html, CRM_PREVIEW_DEFAULTS);
}

/** @deprecated Prefer buildCrmMergePreviewMap — headline/subhead are not CRM aliases. */
export function buildCampaignPreviewMap(
  form: AnnouncementForm,
  brand: BrandSettings,
  variableValues: Record<string, string>,
): Record<string, string | undefined> {
  return buildCrmMergePreviewMap(brand, variableValues, form.buttonUrl);
}

const EMAIL_REGION_TO_FORM: Record<string, keyof AnnouncementForm | null> = {
  eyebrow: 'eyebrow',
  headline: 'headline',
  subheadline: 'subhead',
  body: 'message',
  'cta-label': 'buttonLabel',
  signoff: 'signOff',
};

function recruiterPlainToHtml(text: string, mergeMode: 'tokens' | 'sample', crmMap: Record<string, string | undefined>): string {
  const merged = mergeMode === 'sample' ? resolveMergeTagsInString(text, crmMap) : text;
  return escapeHtml(merged).replace(/\r\n|\n|\r/g, '<br/>');
}

/** True when HTML uses explicit `data-region` markers for the email builder. */
export function htmlHasEmailRegions(html: string): boolean {
  return /\bdata-region\s*=\s*["']/.test(html);
}

/** True when HTML already declares known builder slots (`data-region="headline"`, `cta-url`, …). */
export function htmlHasAssignableEmailRegions(html: string): boolean {
  return /\bdata-region\s*=\s*["'](?:eyebrow|headline|subheadline|body|cta-url|cta-label|signoff)\b/i.test(html);
}

function collapseInnerWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function listItemPlain(li: Element): string {
  return (li.textContent || '').replace(/\s+/g, ' ').trim();
}

function listToPlainLines(list: Element): string {
  const tag = list.tagName.toLowerCase();
  const items = Array.from(list.children).filter(c => c.tagName.toLowerCase() === 'li');
  if (tag === 'ol') {
    return items
      .map((li, i) => `${i + 1}. ${listItemPlain(li)}`)
      .filter(Boolean)
      .join('\n');
  }
  return items
    .map(li => `- ${listItemPlain(li)}`)
    .filter(l => l.length > 2)
    .join('\n');
}

/** Turn block-level children into plain text: paragraphs, lists, mixed layout. */
function extractBodyRegionPlainText(regionEl: Element): string {
  const children = Array.from(regionEl.children);
  if (children.length === 0) {
    return collapseInnerWhitespace(regionEl.textContent || '');
  }

  const parts: string[] = [];
  for (const child of children) {
    const t = child.tagName.toLowerCase();
    if (t === 'p') {
      const line = (child.textContent || '').replace(/\s+/g, ' ').trim();
      if (line) parts.push(line);
    } else if (t === 'ul' || t === 'ol') {
      const block = listToPlainLines(child);
      if (block) parts.push(block);
    } else if (t === 'div') {
      const nested = extractBodyRegionPlainText(child);
      if (nested) parts.push(nested);
    }
  }

  if (parts.length > 0) {
    return parts.join('\n\n');
  }

  const paragraphs = children.filter(c => c.tagName.toLowerCase() === 'p') as HTMLElement[];
  if (paragraphs.length > 0) {
    return paragraphs
      .map(p => (p.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return collapseInnerWhitespace(regionEl.textContent || '');
}

const BODY_EMAIL_TAGS = new Set([
  'p',
  'div',
  'br',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'span',
  'a',
]);

const BODY_SKIP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base']);

function allowedEmailBodyHref(href: string | null): string | null {
  if (href == null) return null;
  const t = href.trim();
  if (!t || /^javascript:/i.test(t)) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('mailto:')) return t;
  if (t.startsWith('#')) return t;
  if (/\{\{/.test(t)) return t;
  return null;
}

function appendSanitizedBodyChildren(out: Element, el: Element, doc: Document): void {
  for (const c of el.childNodes) {
    const n = cloneEmailBodyNode(c, doc);
    if (!n) continue;
    if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const frag = n as DocumentFragment;
      while (frag.firstChild) out.appendChild(frag.firstChild);
    } else {
      out.appendChild(n);
    }
  }
}

function flattenBodyChildrenToFragment(el: Element, doc: Document): DocumentFragment {
  const frag = doc.createDocumentFragment();
  for (const c of el.childNodes) {
    const n = cloneEmailBodyNode(c, doc);
    if (!n) continue;
    if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const inner = n as DocumentFragment;
      while (inner.firstChild) frag.appendChild(inner.firstChild);
    } else {
      frag.appendChild(n);
    }
  }
  return frag;
}

function cloneEmailBodyNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent || '');
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return cloneEmailBodyElement(node as Element, doc);
  }
  return null;
}

function cloneEmailBodyElement(el: Element, doc: Document): Node | null {
  const tag = el.tagName.toLowerCase();
  if (BODY_SKIP_TAGS.has(tag)) {
    return doc.createDocumentFragment();
  }
  if (tag === 'br') {
    return doc.createElement('br');
  }
  if (!BODY_EMAIL_TAGS.has(tag)) {
    return flattenBodyChildrenToFragment(el, doc);
  }
  if (tag === 'a') {
    const href = allowedEmailBodyHref(el.getAttribute('href'));
    if (!href) {
      return flattenBodyChildrenToFragment(el, doc);
    }
    const a = doc.createElement('a');
    a.setAttribute('href', href);
    appendSanitizedBodyChildren(a, el, doc);
    return a.childNodes.length ? a : doc.createDocumentFragment();
  }
  if (tag === 'ul' || tag === 'ol') {
    const out = doc.createElement(tag);
    for (const c of el.children) {
      if (c.tagName.toLowerCase() !== 'li') continue;
      const li = cloneEmailBodyElement(c, doc);
      if (!li) continue;
      if (li.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        const frag = li as DocumentFragment;
        while (frag.firstChild) out.appendChild(frag.firstChild);
      } else {
        out.appendChild(li);
      }
    }
    return out.childNodes.length ? out : null;
  }
  const out = doc.createElement(tag);
  appendSanitizedBodyChildren(out, el, doc);
  if (out.childNodes.length > 0) return out;
  return null;
}

/** True when sanitized body HTML benefits from the rich snapshot path (lists, breaks, inline, multi-paragraph). */
export function bodySanitizedHtmlWarrantsRichSnapshot(html: string): boolean {
  const s = html.trim();
  if (!s) return false;
  if (/<\s*(ul|ol|li)\b/i.test(s)) return true;
  if (/<\s*(strong|em|b|i)\b/i.test(s)) return true;
  if (/<\s*a\s+[^>]*href/i.test(s)) return true;
  if (/<\s*br\b/i.test(s)) return true;
  if ((s.match(/<\s*p\b/gi) || []).length >= 2) return true;
  return false;
}

/**
 * Build a sanitized HTML fragment from `[data-region="body"]` children (p, ul, ol, div), or null if none / not rich enough.
 */
export function extractBodyRegionSanitizedHtml(bodyEl: Element): string | null {
  const doc = bodyEl.ownerDocument;
  if (!doc) return null;

  const acc = doc.createElement('div');
  for (const child of Array.from(bodyEl.children)) {
    const t = child.tagName.toLowerCase();
    if (t !== 'p' && t !== 'ul' && t !== 'ol' && t !== 'div') continue;
    const n = cloneEmailBodyElement(child, doc);
    if (!n) continue;
    if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const frag = n as DocumentFragment;
      while (frag.firstChild) acc.appendChild(frag.firstChild);
    } else {
      acc.appendChild(n);
    }
  }

  if (acc.childNodes.length === 0) {
    const fb = flattenBodyChildrenToFragment(bodyEl, doc);
    while (fb.firstChild) acc.appendChild(fb.firstChild);
  }

  const html = acc.innerHTML.trim();
  if (!html || !bodySanitizedHtmlWarrantsRichSnapshot(html)) return null;
  return html;
}

/** Use when editing `message` (or AI rewrite) so preview falls back to plain body. */
export function clearedRichBodyFields(): Pick<AnnouncementForm, 'useMessageRichHtml' | 'messageRichHtml'> {
  return { useMessageRichHtml: false, messageRichHtml: null };
}

/** Preserve line breaks from <br> before flattening to plain text (e.g. sign-off). */
function elementToPlainWithBr(el: Element): string {
  const raw = (el as HTMLElement).innerHTML || '';
  const withNl = raw.replace(/<br\s*\/?>/gi, '\n');
  const wrapped = new DOMParser().parseFromString(`<div>${withNl}</div>`, 'text/html');
  const t = wrapped.body.textContent || '';
  return t
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .trim();
}

/**
 * Read default copy from `[data-region]` nodes so form fields match the template on load.
 * Returns only keys that were found; omit keys when HTML has no regions or DOM is unavailable.
 */
export function extractAnnouncementDefaultsFromRegionalHtml(html: string): Partial<AnnouncementForm> {
  const clean = stripEmailScripts(html);
  if (!clean.trim() || !htmlHasAssignableEmailRegions(clean)) return {};
  if (typeof DOMParser === 'undefined') return {};

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const out: Partial<AnnouncementForm> = {};

  const eyebrowEl = doc.querySelector('[data-region="eyebrow"]');
  if (eyebrowEl) out.eyebrow = collapseInnerWhitespace(eyebrowEl.textContent || '');

  const headlineEl = doc.querySelector('[data-region="headline"]');
  if (headlineEl) out.headline = collapseInnerWhitespace(headlineEl.textContent || '');

  const subEl = doc.querySelector('[data-region="subheadline"]');
  if (subEl) out.subhead = collapseInnerWhitespace(subEl.textContent || '');

  const bodyEl = doc.querySelector('[data-region="body"]');
  if (bodyEl) {
    out.message = extractBodyRegionPlainText(bodyEl);
    const rich = extractBodyRegionSanitizedHtml(bodyEl);
    if (rich) {
      out.messageRichHtml = rich;
      out.useMessageRichHtml = true;
    }
  }

  const ctaA = doc.querySelector('a[data-region="cta-url"]');
  const ctaLabelInA = ctaA?.querySelector('[data-region="cta-label"]');
  const ctaLabelFallback = doc.querySelector('[data-region="cta-label"]');
  const labelEl = ctaLabelInA ?? ctaLabelFallback;
  if (labelEl) out.buttonLabel = collapseInnerWhitespace(labelEl.textContent || '');

  if (ctaA) {
    const href = (ctaA as HTMLAnchorElement).getAttribute('href')?.trim();
    if (href) out.buttonUrl = href;
  }

  const signEl = doc.querySelector('[data-region="signoff"]');
  if (signEl) out.signOff = elementToPlainWithBr(signEl);

  return out;
}

/**
 * Preview pipeline: inject recruiter copy only into `[data-region]` nodes, then optionally
 * resolve `{{tokens}}` from CRM preview data. No global coupling between headline and job_title.
 */
export function buildCampaignEmailPreviewDocument(
  html: string,
  form: AnnouncementForm,
  crmMap: Record<string, string | undefined>,
  mergeMode: 'tokens' | 'sample',
): string {
  const clean = stripEmailScripts(html);
  if (!clean.trim()) return clean;

  if (typeof DOMParser === 'undefined') {
    return mergeMode === 'sample' ? resolveMergeTagsInString(clean, crmMap) : clean;
  }

  if (!htmlHasAssignableEmailRegions(clean)) {
    if (mergeMode === 'sample') return resolveMergeTagsInString(clean, crmMap);
    return clean;
  }

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const regionNodes = doc.querySelectorAll('[data-region]');

  regionNodes.forEach(el => {
    const region = (el.getAttribute('data-region') || '').trim();
    if (!region) return;

    if (region === 'cta-url') {
      if (el.tagName.toLowerCase() === 'a') {
        const a = el as HTMLAnchorElement;
        const templateHref = a.getAttribute('href') || '';
        const chosen = form.buttonUrl.trim() || templateHref;
        const href = mergeMode === 'sample' ? resolveMergeTagsInString(chosen, crmMap) : chosen;
        a.setAttribute('href', href);
      }
      return;
    }

    const formKey = EMAIL_REGION_TO_FORM[region];
    if (!formKey || formKey === 'blocks' || formKey === 'useBlocks') return;

    const formRaw = String(form[formKey] ?? '').trim();
    const templateHtml = el.innerHTML;

    if (formKey === 'message' && form.useMessageRichHtml && (form.messageRichHtml ?? '').trim()) {
      const inner =
        mergeMode === 'sample'
          ? resolveMergeTagsInString(form.messageRichHtml!.trim(), crmMap)
          : form.messageRichHtml!.trim();
      el.innerHTML = `<div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;white-space:normal;">${inner}</div>`;
      return;
    }

    if (region === 'cta-label') {
      if (formRaw) {
        const s = mergeMode === 'sample' ? resolveMergeTagsInString(formRaw, crmMap) : formRaw;
        el.innerHTML = escapeHtml(s);
      } else {
        el.innerHTML = mergeMode === 'sample' ? resolveMergeTagsInString(templateHtml, crmMap) : templateHtml;
      }
      return;
    }

    if (!formRaw) {
      el.innerHTML = mergeMode === 'sample' ? resolveMergeTagsInString(templateHtml, crmMap) : templateHtml;
      return;
    }

    if (formKey === 'message') {
      el.innerHTML = `<div style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;white-space:pre-wrap;">${recruiterPlainToHtml(
        form.message,
        mergeMode,
        crmMap,
      )}</div>`;
      return;
    }

    if (formKey === 'signOff') {
      el.innerHTML = recruiterPlainToHtml(form.signOff, mergeMode, crmMap);
      return;
    }

    el.innerHTML = recruiterPlainToHtml(String(form[formKey] ?? ''), mergeMode, crmMap);
  });

  if (mergeMode === 'sample') {
    doc.querySelectorAll('[data-email-locked]').forEach(el => {
      const html = (el as HTMLElement).innerHTML || '';
      (el as HTMLElement).innerHTML = resolveMergeTagsInString(html, crmMap);
    });
  }

  const serialized = doc.documentElement?.outerHTML ?? clean;
  return serialized.includes('<!DOCTYPE') ? serialized : `<!DOCTYPE html>${serialized}`;
}

export type MergeTokenUsageRow = { key: string; resolved: boolean; usedIn: string[] };

/** Which recruiter-facing fields / template still contain each merge token (for the variables panel). */
export function buildMergeTokenUsageReport(params: {
  subject: string;
  form: AnnouncementForm;
  htmlBody: string;
  crmMap: Record<string, string | undefined>;
}): MergeTokenUsageRow[] {
  const { subject, form, htmlBody, crmMap } = params;
  const keys = extractMergeVars(
    subject,
    form.previewText,
    form.eyebrow,
    form.headline,
    form.subhead,
    form.message,
    form.messageRichHtml ?? '',
    form.buttonLabel,
    form.buttonUrl,
    form.signOff,
    htmlBody,
  );
  const sources: { label: string; text: string }[] = [
    { label: 'subjectLine', text: subject },
    { label: 'previewText', text: form.previewText },
    { label: 'eyebrow', text: form.eyebrow },
    { label: 'headline', text: form.headline },
    { label: 'subheadline', text: form.subhead },
    { label: 'body', text: form.message },
    { label: 'bodyHtml', text: form.messageRichHtml ?? '' },
    { label: 'ctaLabel', text: form.buttonLabel },
    { label: 'ctaUrl', text: form.buttonUrl },
    { label: 'signOff', text: form.signOff },
    { label: 'template HTML', text: htmlBody },
  ];
  return keys.map(key => {
    const tag = `{{${key}}}`;
    const usedIn = sources.filter(s => s.text.includes(tag)).map(s => s.label);
    return {
      key,
      resolved: String(crmMap[key] ?? '').trim().length > 0,
      usedIn,
    };
  });
}

/** Apply brand primary to common CTA blues in HTML for live preview */
export function applyBrandPrimaryToHtmlPreview(html: string, brand: BrandSettings): string {
  if (!brand.useBrandColors) return html;
  const p = brand.primaryColor;
  return html
    .replace(/#2563eb/gi, p)
    .replace(/#1d4ed8/gi, p)
    .replace(/#059669/gi, p)
    .replace(/#7c3aed/gi, p);
}

/** Create an empty announcement form */
export function emptyAnnouncementForm(): AnnouncementForm {
  return {
    eyebrow: '',
    headline: '',
    subhead: '',
    message: '',
    messageRichHtml: null,
    useMessageRichHtml: false,
    previewText: '',
    buttonLabel: '',
    buttonUrl: '',
    signOff: '',
    blocks: [],
    useBlocks: false,
  };
}

/** Convert announcement form to JSON payload */
export function announcementFormToPayload(form: AnnouncementForm): AnnouncementForm {
  return { ...form };
}

/** Convert payload back to announcement form */
export function payloadToAnnouncementForm(payload: unknown): AnnouncementForm {
  const p = payload as Partial<AnnouncementForm> | null;
  return {
    eyebrow: p?.eyebrow ?? '',
    headline: p?.headline ?? '',
    subhead: p?.subhead ?? '',
    message: p?.message ?? '',
    messageRichHtml: p?.messageRichHtml ?? null,
    useMessageRichHtml: p?.useMessageRichHtml ?? false,
    previewText: p?.previewText ?? '',
    buttonLabel: p?.buttonLabel ?? '',
    buttonUrl: p?.buttonUrl ?? '',
    signOff: p?.signOff ?? '',
    blocks: p?.blocks ?? [],
    useBlocks: p?.useBlocks ?? false,
  };
}

/** Check if announcement form is valid for saving (requires headline or blocks) */
export function isValidAnnouncementForSave(form: AnnouncementForm): boolean {
  if (form.useBlocks) return form.blocks.length > 0;
  return form.headline.trim().length > 0;
}

// ========== Email Shell & CTA Button (moved from email-mock-data) ==========

export function emailShell(preheader: string, bodyRows: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>{{senderCompany}}</title>
<!--[if !mso]><!-->
<style type="text/css">
@media only screen and (max-width:620px){
  .email-container{width:100%!important;max-width:100%!important;}
  .fluid{width:100%!important;max-width:100%!important;height:auto!important;}
  .stack-column{display:block!important;width:100%!important;max-width:100%!important;}
  .center-on-narrow{text-align:center!important;display:block!important;margin-left:auto!important;margin-right:auto!important;float:none!important;}
  table.center-on-narrow{display:inline-block!important;}
  .padding-mobile{padding-left:20px!important;padding-right:20px!important;}
}
</style>
<!--<![endif]-->
<!--[if mso]>
<style type="text/css">
table{border-collapse:collapse;}
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- Preheader (hidden) -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
${preheader}
</div>
<center style="width:100%;background-color:#f4f4f7;">
<!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin:0 auto;max-width:600px;">
${bodyRows}
</table>
<!--[if mso]></td></tr></table><![endif]-->
<!-- Footer -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin:0 auto;max-width:600px;">
<tr>
<td style="padding:30px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#9a9a9a;text-align:center;" class="padding-mobile">
<p style="margin:0 0 8px;">{{senderCompany}}</p>
<p style="margin:0;">You're receiving this because you're part of our talent community.<br/>
<a href="{{unsubscribeLink}}" style="color:#9a9a9a;text-decoration:underline;">Unsubscribe</a></p>
</td>
</tr>
</table>
</center>
</body>
</html>`;
}

export function ctaButton(label: string, url: string, bgColor = '#2563eb', textColor = '#ffffff'): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:auto;">
<tr>
<td style="border-radius:6px;background:${bgColor};text-align:center;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="14%" strokecolor="${bgColor}" fillcolor="${bgColor}">
<w:anchorlock/>
<center style="color:${textColor};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;">
<span data-region="cta-label">${label}</span>
</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a data-region="cta-url" href="${url}" target="_blank" style="background:${bgColor};border:1px solid ${bgColor};border-radius:6px;color:${textColor};display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:220px;-webkit-text-size-adjust:none;">
<span data-region="cta-label">${label}</span>
</a>
<!--<![endif]-->
</td>
</tr>
</table>`;
}

// ========== HTML to Blocks Parser ==========

export function parseHtmlToBlocks(html: string): ContentBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: ContentBlock[] = [];

  // Find the main content area — look for the email-container table or fall back to body
  const body = doc.body;
  if (!body) return blocks;

  // Walk all relevant elements in document order
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Element) => {
      const tag = node.tagName?.toLowerCase();
      // Skip hidden preheader divs
      if (tag === 'div' && (node as HTMLElement).style?.display === 'none') return NodeFilter.FILTER_REJECT;
      // Skip MSO conditional comments content (handled as text)
      if (['h1', 'h2', 'h3', 'p', 'img', 'a', 'hr', 'td'].includes(tag)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    }
  });

  const seenTexts = new Set<string>();
  const footerKeywords = ['unsubscribe', 'email preferences', 'receiving this'];

  let node: Element | null = walker.currentNode as Element;
  while (node) {
    const tag = node.tagName?.toLowerCase();
    const text = (node.textContent || '').trim();

    // Skip empty or footer content
    if (text && footerKeywords.some(kw => text.toLowerCase().includes(kw))) {
      node = walker.nextNode() as Element | null;
      continue;
    }

    if (['h1', 'h2', 'h3'].includes(tag) && text && !seenTexts.has(text)) {
      seenTexts.add(text);
      blocks.push({
        type: 'heading',
        id: genBlockId(),
        text,
        level: parseInt(tag[1]) as 1 | 2 | 3,
      });
    } else if (tag === 'img') {
      const img = node as HTMLImageElement;
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:') && src !== '') {
        blocks.push({
          type: 'image',
          id: genBlockId(),
          url: src,
          alt: img.getAttribute('alt') || '',
          width: img.width || undefined,
        });
      }
    } else if (tag === 'a') {
      const anchor = node as HTMLAnchorElement;
      const style = anchor.getAttribute('style') || '';
      const isButton = (style.includes('background') && style.includes('display:inline-block')) ||
                       (style.includes('background') && style.includes('border-radius')) ||
                       (style.includes('line-height:44px'));
      if (isButton && text && !seenTexts.has('btn:' + text)) {
        seenTexts.add('btn:' + text);
        blocks.push({
          type: 'button',
          id: genBlockId(),
          label: text,
          url: anchor.getAttribute('href') || '#',
        });
      }
    } else if (tag === 'hr') {
      blocks.push({ type: 'divider', id: genBlockId() });
    } else if (tag === 'p' && text && !seenTexts.has(text)) {
      // Skip very short labels that are likely metadata (like "Now Hiring", dates, etc.)
      const style = (node as HTMLElement).getAttribute('style') || '';
      const isLabel = style.includes('text-transform:uppercase') || style.includes('letter-spacing');
      if (!isLabel && text.length > 2) {
        seenTexts.add(text);
        blocks.push({
          type: 'text',
          id: genBlockId(),
          content: text,
        });
      }
    } else if (tag === 'td') {
      // Only extract text from TDs that have direct text content (not just nested elements)
      const directText = Array.from(node.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => (n.textContent || '').trim())
        .join(' ')
        .trim();
      
      // TDs with border-top are dividers
      const style = (node as HTMLElement).getAttribute('style') || '';
      if (style.includes('border-top') && (!directText || directText === '&nbsp;' || directText === '\u00a0')) {
        blocks.push({ type: 'divider', id: genBlockId() });
      }
    }

    node = walker.nextNode() as Element | null;
  }

  return blocks;
}

// ========== Blocks to HTML Renderer ==========

function renderBlockRow(block: ContentBlock, brand?: BrandSettings): string {
  const font = brand?.fontFamily || 'Arial,Helvetica,sans-serif';
  const primary =
    brand?.useBrandColors === true ? (brand?.primaryColor || '#2563eb') : '#2563eb';

  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level}`;
      const sizes: Record<number, string> = { 1: '28px', 2: '22px', 3: '18px' };
      return `<tr>
<td style="padding:0 40px 10px;background-color:#ffffff;" class="padding-mobile">
<${tag} style="margin:0;font-family:${font};font-size:${sizes[block.level] || '22px'};line-height:1.3;color:#1a1a2e;font-weight:bold;">${block.text}</${tag}>
</td>
</tr>`;
    }
    case 'text':
      return `<tr>
<td style="padding:0 40px 12px;background-color:#ffffff;" class="padding-mobile">
<p style="margin:0;font-family:${font};font-size:15px;line-height:24px;color:#374151;white-space:pre-wrap;">${block.content}</p>
</td>
</tr>`;
    case 'image':
      return `<tr>
<td style="padding:0 40px 16px;background-color:#ffffff;" class="padding-mobile">
<img src="${block.url}" alt="${block.alt}" width="${block.width || 520}" style="display:block;max-width:100%;height:auto;border:0;border-radius:6px;" class="fluid" />
</td>
</tr>`;
    case 'button':
      return `<tr>
<td style="padding:10px 40px 20px;background-color:#ffffff;" class="padding-mobile">
${ctaButton(block.label, block.url, primary)}
</td>
</tr>`;
    case 'divider':
      return `<tr>
<td style="padding:0 40px;background-color:#ffffff;" class="padding-mobile">
<table role="presentation" width="100%"><tr><td style="border-top:1px solid #e5e7eb;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
</td>
</tr>`;
    case 'spacer':
      return `<tr>
<td style="padding:0;background-color:#ffffff;font-size:1px;line-height:${block.height}px;height:${block.height}px;">&nbsp;</td>
</tr>`;
    default:
      return '';
  }
}

export function renderBlocksToHTML(blocks: ContentBlock[], siteConfig: { siteName: string }, brand?: BrandSettings): string {
  const firstHeading = blocks.find(b => b.type === 'heading');
  const preheader = firstHeading?.type === 'heading' ? firstHeading.text : siteConfig.siteName;

  const logoRow = brand?.logoUrl
    ? `<tr><td style="padding:20px 40px 10px;background-color:#ffffff;border-radius:8px 8px 0 0;text-align:center;" class="padding-mobile">
        <img src="${brand.logoUrl}" alt="${brand.companyName || siteConfig.siteName}" style="max-height:50px;max-width:200px;display:inline-block;" />
       </td></tr>`
    : '';

  // Wrap first and last rows with border-radius
  const rows = blocks.map((b, i) => {
    let row = renderBlockRow(b, brand);
    if (i === 0 && !logoRow) {
      row = row.replace('background-color:#ffffff;', 'background-color:#ffffff;border-radius:8px 8px 0 0;');
    }
    if (i === blocks.length - 1) {
      row = row.replace('background-color:#ffffff;', 'background-color:#ffffff;border-radius:0 0 8px 8px;');
    }
    return row;
  }).join('\n');

  // Add top padding to first row
  const bodyRows = `<!-- Top spacing -->
<tr><td style="padding:20px 0 0;"></td></tr>
${logoRow}
${rows}`;

  return emailShell(preheader, bodyRows);
}

/** Render announcement form to responsive HTML string (legacy flat-field mode) */
export function renderAnnouncementToHTML(
  form: AnnouncementForm,
  siteConfig: { siteName: string; memberName?: string },
  brand?: BrandSettings
): string {
  // Block layout (including empty — preview/shell only until user adds blocks)
  if (form.useBlocks) {
    return renderBlocksToHTML(form.blocks, siteConfig, brand);
  }

  const { headline, subhead, message, messageRichHtml, useMessageRichHtml, previewText, buttonLabel, buttonUrl, signOff } = form;
  const font = brand?.fontFamily || 'Arial, Helvetica, sans-serif';
  const useBrand = brand?.useBrandColors === true;
  const ctaBg = useBrand ? (brand?.primaryColor || '#2563eb') : '#18181b';
  const preheader = (previewText || siteConfig.siteName).replace(/</g, '&lt;');

  const logoRow =
    brand?.logoUrl?.trim()
      ? `<tr><td style="padding:0 32px 12px;text-align:center;">
<img src="${brand.logoUrl}" alt="${(brand.companyName || siteConfig.siteName).replace(/"/g, '&quot;')}" style="max-height:50px;max-width:200px;display:inline-block;" />
</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; padding: 16px !important; }
    .headline { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${font};">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:32px;">
${logoRow}
<tr><td style="font-size:12px;color:#71717a;padding-bottom:16px;font-family:${font};">${siteConfig.siteName}</td></tr>
${siteConfig.memberName ? `<tr><td style="font-size:14px;color:#3f3f46;padding-bottom:8px;font-family:${font};">Hi ${siteConfig.memberName},</td></tr>` : ''}
<tr><td class="headline" style="font-size:26px;font-weight:700;color:#18181b;padding-bottom:8px;font-family:${font};">${headline}</td></tr>
${subhead ? `<tr><td style="font-size:16px;color:#52525b;padding-bottom:16px;font-family:${font};">${subhead}</td></tr>` : ''}
${useMessageRichHtml && (messageRichHtml ?? '').trim() ? `<tr><td style="font-size:14px;color:#3f3f46;line-height:1.6;padding-bottom:24px;font-family:${font};">${messageRichHtml}</td></tr>` : message ? `<tr><td style="font-size:14px;color:#3f3f46;line-height:1.6;padding-bottom:24px;white-space:pre-wrap;font-family:${font};">${message}</td></tr>` : ''}
${buttonLabel && buttonUrl ? `<tr><td style="padding-bottom:24px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${buttonUrl}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="10%" strokecolor="${ctaBg}" fillcolor="${ctaBg}"><center style="color:#ffffff;font-family:${font};font-size:14px;font-weight:bold;">${buttonLabel}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${buttonUrl}" style="display:inline-block;background:${ctaBg};color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;font-family:${font};">${buttonLabel}</a><!--<![endif]-->
</td></tr>` : ''}
${signOff ? `<tr><td style="font-size:14px;color:#71717a;padding-top:8px;font-family:${font};">${signOff}</td></tr>` : ''}
<tr><td style="font-size:11px;color:#a1a1aa;padding-top:24px;border-top:1px solid #e4e4e7;font-family:${font};">
<a href="{{unsubscribeLink}}" style="color:#a1a1aa;">Unsubscribe</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Unified preview HTML for Visual vs Code mode (email editor / live preview pane). */
export function getEmailEditorPreviewHtml(
  composeKind: ComposeKind,
  formPayload: AnnouncementForm,
  htmlBody: string,
  siteName: string,
): string {
  if (composeKind === 'announcement_form') {
    return renderAnnouncementToHTML(formPayload, { siteName });
  }
  return applySampleMerge(htmlBody, {});
}
