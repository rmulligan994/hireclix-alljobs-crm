import { describe, expect, it } from 'vitest';
import { findUnknownMergeTagsInStrings } from '@/lib/email/merge-tags-validation';
import { STARTER_TEMPLATES } from '@/data/email-starter-data';

describe('findUnknownMergeTagsInStrings', () => {
  it('treats send-pipeline alias tokens as known', () => {
    expect(findUnknownMergeTagsInStrings('{{department}} {{apply_url}}', '{{member_name}}')).toEqual([]);
  });

  it('still flags typos', () => {
    expect(findUnknownMergeTagsInStrings('Hi {{firstNmae}}', '')).toEqual(['firstNmae']);
  });

  it('starter library subjects and bodies use only known tokens', () => {
    for (const t of STARTER_TEMPLATES) {
      const unknown = findUnknownMergeTagsInStrings(t.subject, t.html);
      expect(unknown, `starter ${t.id}`).toEqual([]);
    }
  });
});
