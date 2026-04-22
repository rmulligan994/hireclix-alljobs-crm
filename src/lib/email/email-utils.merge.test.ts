import { describe, expect, it } from 'vitest';
import {
  resolveMergeTagsInString,
  CRM_PREVIEW_DEFAULTS,
  applySampleMerge,
  applySampleMergeForPreview,
  getEmailEditorPreviewHtml,
  emptyAnnouncementForm,
  renderAnnouncementToHTML,
  announcementFormHasClassicBodyContent,
} from '@/lib/email/email-utils';
import { KNOWN_MERGE_TAG_KEYS } from '@/lib/email/merge-tags-validation';

describe('resolveMergeTagsInString', () => {
  it('replaces Clarity camelCase tokens used in send-campaign-email', () => {
    const html = 'Hi {{firstName}}, apply: {{jobUrl}} — {{unsubscribeLink}}';
    const out = resolveMergeTagsInString(html, CRM_PREVIEW_DEFAULTS);
    expect(out).toContain('Jane');
    expect(out).toContain('https://example.com/job');
    expect(out).toContain('#unsubscribe');
  });

  it('leaves unknown tokens literal even if map has a value', () => {
    const out = resolveMergeTagsInString('{{notARealMergeKey}}', {
      notARealMergeKey: 'x',
    } as Record<string, string>);
    expect(out).toBe('{{notARealMergeKey}}');
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

describe('CRM_PREVIEW_DEFAULTS', () => {
  it('only defines keys in the send/validation allowlist', () => {
    for (const k of Object.keys(CRM_PREVIEW_DEFAULTS)) {
      expect(KNOWN_MERGE_TAG_KEYS.has(k)).toBe(true);
    }
  });
});

describe('applySampleMergeForPreview', () => {
  it('wraps known substitutions in preview-only spans', () => {
    const html = '<p>Hi {{firstName}}</p>';
    const out = applySampleMergeForPreview(html);
    expect(out).toContain('<span ');
    expect(out).toContain('Jane');
    expect(out).toMatch(/title="Sample: \{\{firstName\}\}"/);
    expect(out).not.toMatch(/>\s*\{\{\s*firstName\s*\}\}\s*</);
  });

  it('substitutes inside href without span so links stay valid', () => {
    const html = '<a href="{{unsubscribeLink}}">Unsubscribe</a>';
    const out = applySampleMergeForPreview(html);
    expect(out).toBe('<a href="#unsubscribe">Unsubscribe</a>');
    expect(out).not.toContain('<span');
  });

  it('does not wrap unknown tokens', () => {
    const out = applySampleMergeForPreview('{{totallyUnknownTag}}');
    expect(out).toBe('{{totallyUnknownTag}}');
  });
});

describe('getEmailEditorPreviewHtml', () => {
  it('leaves merge tokens literal when mergeHighlights is false (announcement form)', () => {
    const form = { ...emptyAnnouncementForm(), headline: 'Open: {{jobTitle}}' };
    const html = getEmailEditorPreviewHtml('announcement_form', form, '', 'Acme', {
      mergeHighlights: false,
    });
    expect(html).toContain('{{jobTitle}}');
    expect(html).not.toContain('<span ');
  });

  it('leaves merge tokens literal when mergeHighlights is false (raw html)', () => {
    const html = getEmailEditorPreviewHtml(
      'raw_html',
      emptyAnnouncementForm(),
      '<p>Hi {{firstName}}</p>',
      'Acme',
      { mergeHighlights: false },
    );
    expect(html).toContain('{{firstName}}');
  });

  it('substitutes with preview spans when mergeHighlights is true', () => {
    const html = getEmailEditorPreviewHtml(
      'raw_html',
      emptyAnnouncementForm(),
      '<p>Hi {{firstName}}</p>',
      'Acme',
      { mergeHighlights: true },
    );
    expect(html).toContain('<span ');
    expect(html).toContain('Jane');
  });
});

describe('renderAnnouncementToHTML (useBlocks without blocks)', () => {
  it('uses flat layout when useBlocks is true, blocks empty, and classic fields are filled', () => {
    const form = {
      ...emptyAnnouncementForm(),
      useBlocks: true,
      blocks: [],
      headline: 'We are hiring forklift operators',
      message: 'Apply today.',
    };
    const html = renderAnnouncementToHTML(form, { siteName: 'Acme' });
    expect(html).toContain('We are hiring forklift operators');
    expect(html).toContain('Apply today.');
  });

  it('uses block shell when useBlocks is true, blocks empty, and no classic body', () => {
    const form = {
      ...emptyAnnouncementForm(),
      useBlocks: true,
      blocks: [],
    };
    expect(announcementFormHasClassicBodyContent(form)).toBe(false);
    const html = renderAnnouncementToHTML(form, { siteName: 'Acme' });
    expect(html.length).toBeGreaterThan(100);
  });
});

describe('announcementFormHasClassicBodyContent', () => {
  it('is false for empty announcement form', () => {
    expect(announcementFormHasClassicBodyContent(emptyAnnouncementForm())).toBe(false);
  });

  it('is true when any classic field is non-empty', () => {
    expect(
      announcementFormHasClassicBodyContent({
        ...emptyAnnouncementForm(),
        headline: 'Hi',
      }),
    ).toBe(true);
  });
});
