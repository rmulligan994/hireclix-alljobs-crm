import { MERGE_TAG_CATALOG } from '@/lib/email/merge-tags-catalog';
import { MERGE_CONTEXT_REPLACEMENT_KEYS } from '@/lib/email/merge-context-replacement-keys';
import type { CampaignEmail } from '@/types/Campaign';

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Catalog tokens plus every key the edge send pipeline may substitute (keep in sync with `campaign-merge-tags.ts`). */
export const KNOWN_MERGE_TAG_KEYS = new Set<string>([
  ...MERGE_TAG_CATALOG.map((t) => t.key),
  ...MERGE_CONTEXT_REPLACEMENT_KEYS,
]);

export function extractMergeTagKeysFromText(text: string): string[] {
  const keys = new Set<string>();
  const re = new RegExp(TOKEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) keys.add(m[1]);
  return [...keys];
}

/** Tags in subject/body that are not in the supported catalog (typos or unsupported tokens). */
export function findUnknownMergeTagsInStrings(subject: string, html: string): string[] {
  const unknown = new Set<string>();
  for (const key of extractMergeTagKeysFromText(`${subject}\n${html}`)) {
    if (!KNOWN_MERGE_TAG_KEYS.has(key)) unknown.add(key);
  }
  return [...unknown].sort();
}

export function findUnknownMergeTagsInCampaignSteps(steps: Partial<CampaignEmail>[]): string[] {
  const unknown = new Set<string>();
  for (const step of steps) {
    const sub = step.subject ?? '';
    const html = step.html_content ?? '';
    for (const k of findUnknownMergeTagsInStrings(sub, html)) unknown.add(k);
  }
  return [...unknown].sort();
}

export function formatUnknownMergeTagsMessage(keys: string[]): string {
  if (keys.length === 0) return '';
  const shown = keys.map((k) => `{{${k}}}`).join(', ');
  return `Unknown merge tags: ${shown}. Fix or remove them before sending.`;
}
