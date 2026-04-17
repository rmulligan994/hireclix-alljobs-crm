import type { AnnouncementForm } from '@/types/email-types';
import {
  emptyAnnouncementForm,
  extractAnnouncementDefaultsFromRegionalHtml,
  htmlHasAssignableEmailRegions,
  stripEmailScripts,
} from '@/lib/email/email-utils';
import { prepareEmailRegionMapping, type PrepareRegionMappingResult } from '@/lib/email/email-region-detection';

/** Shared copy for paste/import flows (builder + campaign landing). */
export const SCRATCH_HTML_IMPORT_COPY = {
  scratchBlurb:
    'Upload a file or paste code. Scripts are stripped for safety. If your HTML already uses data-region markers, fields update automatically; otherwise you will map each block to the form. AI never outputs raw HTML here.',
  pasteDialogTitle: 'Paste HTML',
  pasteDialogDescription:
    'Scripts are removed for safety. Templates without data-region markers open a short mapping step so headline, body, and CTA stay in sync with the form.',
  pasteDialogConfirm: 'Apply',
  pasteEmptyError: 'Paste HTML first',
  noHtmlToImport: 'No HTML to import',
  toastAssignableRegions: 'Region markers found — form fields updated from your HTML.',
  toastStaticFallback:
    'No editable regions were detected. HTML was added as-is. Add data-region attributes or try a simpler layout, then re-import.',
  toastRegionMapped: 'Regions mapped — form fields now drive the matching blocks in your HTML.',
} as const;

export type ScratchEmailHtmlImportPlan =
  | { kind: 'empty' }
  | { kind: 'assignable_regions'; html: string }
  | { kind: 'region_review'; prep: PrepareRegionMappingResult }
  | { kind: 'static_html'; html: string };

/** Classify pasted/uploaded HTML: ready for form binding, needs region review, or static-only. */
export function planScratchEmailHtmlImport(raw: string): ScratchEmailHtmlImportPlan {
  const stripped = stripEmailScripts(raw);
  if (!stripped.trim()) return { kind: 'empty' };
  if (htmlHasAssignableEmailRegions(stripped)) return { kind: 'assignable_regions', html: stripped };
  const prep = prepareEmailRegionMapping(stripped);
  if (prep.candidates.length === 0) return { kind: 'static_html', html: stripped };
  return { kind: 'region_review', prep };
}

export function buildFormPayloadFromImportedHtml(html: string, defaultSignOff: string): AnnouncementForm {
  const ext = extractAnnouncementDefaultsFromRegionalHtml(html);
  return {
    ...emptyAnnouncementForm(),
    ...ext,
    signOff: ext.signOff?.trim() ? ext.signOff : defaultSignOff,
  };
}
