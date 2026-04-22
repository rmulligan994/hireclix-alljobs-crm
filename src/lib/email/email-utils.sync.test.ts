import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '@/types/email-types';
import {
  blocksToClassicAnnouncementFields,
  emptyAnnouncementForm,
  payloadToAnnouncementForm,
  syncClassicAnnouncementFieldsIntoBlocks,
} from '@/lib/email/email-utils';

describe('payloadToAnnouncementForm', () => {
  it('hydrates classic fields from blocks when useBlocks is false', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', id: 'h-1', text: 'From block', level: 2 },
      { type: 'text', id: 't-1', content: 'Sub', contentHtml: null },
    ];
    const out = payloadToAnnouncementForm({
      headline: 'Stale',
      subhead: '',
      eyebrow: '',
      message: '',
      blocks,
      useBlocks: false,
    });
    expect(out.headline).toBe('From block');
    expect(out.subhead).toBe('Sub');
  });
});

describe('blocksToClassicAnnouncementFields', () => {
  it('skips leading image blocks and still maps headline and subhead', () => {
    const blocks: ContentBlock[] = [
      { type: 'image', id: 'img-1', url: 'https://example.com/a.jpg', alt: 'Hero' },
      { type: 'heading', id: 'h-1', text: 'Main title', level: 2 },
      { type: 'text', id: 't-1', content: 'Subhead line', contentHtml: null },
    ];
    const prev = emptyAnnouncementForm();
    const out = blocksToClassicAnnouncementFields(blocks, prev);
    expect(out.eyebrow).toBe('');
    expect(out.headline).toBe('Main title');
    expect(out.subhead).toBe('Subhead line');
    expect(out.blocks).toHaveLength(3);
  });
});

describe('syncClassicAnnouncementFieldsIntoBlocks', () => {
  it('splits message on blank lines across text blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', id: 'h-1', text: 'Old', level: 2 },
      { type: 'text', id: 't-sub', content: '', contentHtml: null },
      { type: 'text', id: 't-m1', content: 'x', contentHtml: null },
      { type: 'text', id: 't-m2', content: 'y', contentHtml: null },
    ];
    const form = {
      ...emptyAnnouncementForm(),
      useBlocks: false,
      blocks,
      headline: 'H',
      subhead: 'S',
      message: 'First para\n\nSecond para',
    };
    const out = syncClassicAnnouncementFieldsIntoBlocks(form);
    const t1 = out.blocks[2] as Extract<ContentBlock, { type: 'text' }>;
    const t2 = out.blocks[3] as Extract<ContentBlock, { type: 'text' }>;
    expect(t1.content).toBe('First para');
    expect(t2.content).toBe('Second para');
  });

  it('updates button fields from simple form', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', id: 'h-1', text: 'Hi', level: 2 },
      { type: 'text', id: 't-1', content: '', contentHtml: null },
      {
        type: 'button',
        id: 'b-1',
        label: 'Old',
        url: 'https://old.example',
        bgColor: '#000',
        textColor: '#fff',
      },
    ];
    const form = {
      ...emptyAnnouncementForm(),
      useBlocks: false,
      blocks,
      headline: 'Hi',
      buttonLabel: 'Apply now',
      buttonUrl: 'https://jobs.example/123',
    };
    const out = syncClassicAnnouncementFieldsIntoBlocks(form);
    const btn = out.blocks.find((b) => b.type === 'button') as Extract<ContentBlock, { type: 'button' }>;
    expect(btn.label).toBe('Apply now');
    expect(btn.url).toBe('https://jobs.example/123');
  });
});
