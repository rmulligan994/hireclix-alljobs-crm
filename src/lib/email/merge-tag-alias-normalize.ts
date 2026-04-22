import type { AnnouncementForm, ComposeKind, ContentBlock } from '@/types/email-types';

/**
 * Maps tokens models often emit to canonical keys accepted by merge-tag validation and the send pipeline.
 */
const MERGE_TOKEN_ALIASES: Record<string, string> = {
  first_name: 'firstName',
  last_name: 'lastName',
  candidate_first_name: 'firstName',
  candidate_last_name: 'lastName',
  candidate_name: 'fullName',
  candidate_email: 'email',
};

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function normalizeMergeAliasesInString(s: string): string {
  return s.replace(TOKEN_RE, (full, key: string) => {
    const canon = MERGE_TOKEN_ALIASES[key];
    return canon ? `{{${canon}}}` : full;
  });
}

function normalizeBlock(b: ContentBlock): ContentBlock {
  const n = normalizeMergeAliasesInString;
  switch (b.type) {
    case 'heading':
      return {
        ...b,
        text: n(b.text),
        textHtml: b.textHtml ? n(b.textHtml) : b.textHtml,
      };
    case 'text':
      return {
        ...b,
        content: n(b.content),
        contentHtml: b.contentHtml ? n(b.contentHtml) : null,
      };
    case 'button':
      return { ...b, label: n(b.label), url: n(b.url) };
    case 'image':
      return { ...b, url: n(b.url), alt: n(b.alt) };
    default:
      return b;
  }
}

export function normalizeAnnouncementFormMergeAliases(form: AnnouncementForm): AnnouncementForm {
  const n = normalizeMergeAliasesInString;
  const cf = form.complianceFooter;
  return {
    ...form,
    eyebrow: n(form.eyebrow),
    headline: n(form.headline),
    subhead: n(form.subhead),
    message: n(form.message),
    messageRichHtml: form.messageRichHtml ? n(form.messageRichHtml) : null,
    previewText: n(form.previewText),
    buttonLabel: n(form.buttonLabel),
    buttonUrl: n(form.buttonUrl),
    signOff: n(form.signOff),
    blocks: form.blocks.map(normalizeBlock),
    complianceFooter: {
      ...cf,
      companyLine: n(cf.companyLine),
      disclaimerText: n(cf.disclaimerText),
      unsubscribeLinkLabel: n(cf.unsubscribeLinkLabel),
    },
  };
}

/** Normalizes AI-emitted token aliases so merge-tag validation matches the send pipeline. */
export function normalizeEmailAssistantStateSlice(slice: {
  subject: string;
  composeKind: ComposeKind;
  formPayload: AnnouncementForm;
  htmlBody: string;
}): typeof slice {
  return {
    ...slice,
    subject: normalizeMergeAliasesInString(slice.subject),
    htmlBody: normalizeMergeAliasesInString(slice.htmlBody),
    formPayload: normalizeAnnouncementFormMergeAliases(slice.formPayload),
  };
}
