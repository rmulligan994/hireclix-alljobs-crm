import { describe, expect, it } from 'vitest';
import { emptyAnnouncementForm } from '@/lib/email/email-utils';
import { normalizeEmailAssistantStateSlice, normalizeMergeAliasesInString } from '@/lib/email/merge-tag-alias-normalize';
import { findUnknownMergeTagsInStrings } from '@/lib/email/merge-tags-validation';
import { renderAnnouncementToHTML } from '@/lib/email/email-utils';

describe('merge-tag-alias-normalize', () => {
  it('maps common snake_case candidate tokens to catalog keys', () => {
    const s = 'Hi {{first_name}}, from {{company_name}} — role: {{job_title}}';
    expect(normalizeMergeAliasesInString(s)).toBe(
      'Hi {{firstName}}, from {{company_name}} — role: {{job_title}}',
    );
  });

  it('allows AI classic field payload to pass merge validation after normalize', () => {
    const slice = normalizeEmailAssistantStateSlice({
      subject: 'Hello {{first_name}}',
      composeKind: 'announcement_form',
      htmlBody: '',
      formPayload: {
        ...emptyAnnouncementForm(),
        headline: '{{candidate_name}}',
        message: 'See {{job_title}} at {{senderCompany}}',
        previewText: '',
      },
    });
    const html = renderAnnouncementToHTML(slice.formPayload, { siteName: 'Acme' });
    const bad = findUnknownMergeTagsInStrings(slice.subject, html);
    expect(bad).toEqual([]);
  });
});
