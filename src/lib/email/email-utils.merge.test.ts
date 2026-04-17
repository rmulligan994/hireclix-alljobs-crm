import { describe, expect, it } from 'vitest';
import { resolveMergeTagsInString, CRM_PREVIEW_DEFAULTS, applySampleMerge } from '@/lib/email/email-utils';

describe('resolveMergeTagsInString', () => {
  it('replaces Clarity camelCase tokens used in send-campaign-email', () => {
    const html = 'Hi {{firstName}}, apply: {{jobUrl}} — {{unsubscribeLink}}';
    const out = resolveMergeTagsInString(html, CRM_PREVIEW_DEFAULTS);
    expect(out).toContain('Jane');
    expect(out).toContain('https://example.com/job');
    expect(out).toContain('#unsubscribe');
  });
});

describe('applySampleMerge', () => {
  it('resolves legacy starter tokens for preview', () => {
    const html = '<p>{{company_name}}</p><a href="{{unsubscribe_url}}">x</a>';
    const out = applySampleMerge(html);
    expect(out).not.toContain('{{company_name}}');
    expect(out).not.toContain('{{unsubscribe_url}}');
  });
});
