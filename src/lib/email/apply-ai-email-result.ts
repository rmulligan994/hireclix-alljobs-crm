import type { AnnouncementForm, ComposeKind } from '@/types/email-types';
import type { AIEmailAssistantResult } from '@/lib/email/email-ai-adapter';
import {
  clearedRichBodyFields,
  emptyAnnouncementForm,
  parseHtmlToBlocks,
  stripEmailScripts,
} from '@/lib/email/email-utils';

const ALLOWED_BTN = new Set(['jobUrl', 'unsubscribeLink', 'viewInBrowserLink']);

export function sanitizeFormButtonUrl(raw: string): string {
  const t = raw.trim();
  const m = /^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/.exec(t);
  if (m && ALLOWED_BTN.has(m[1])) return `{{${m[1]}}}`;
  return '{{jobUrl}}';
}

export interface EmailStateSlice {
  subject: string;
  composeKind: ComposeKind;
  formPayload: AnnouncementForm;
  htmlBody: string;
}

/**
 * Maps an AI assistant result into editor state: Visual blocks (HTML fragment → parse),
 * classic fields, or full HTML for Code mode.
 */
export function mergeAIEmailAssistantResult(result: AIEmailAssistantResult): EmailStateSlice {
  const subject = result.subject.trim();
  const previewText = result.previewText.trim().slice(0, 500);

  if (result.delivery_mode === 'raw_html' && result.html_body_full.trim()) {
    return {
      subject: subject || 'Email',
      composeKind: 'raw_html',
      htmlBody: stripEmailScripts(result.html_body_full),
      formPayload: { ...emptyAnnouncementForm(), previewText },
    };
  }

  if (result.delivery_mode === 'visual_blocks' && result.body_html_fragment.trim()) {
    const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${result.body_html_fragment}</body></html>`;
    const blocks = parseHtmlToBlocks(wrapped);
    if (blocks.length > 0) {
      return {
        subject: subject || 'Email',
        composeKind: 'announcement_form',
        htmlBody: '',
        formPayload: {
          ...emptyAnnouncementForm(),
          useBlocks: true,
          blocks,
          previewText,
          ...clearedRichBodyFields(),
        },
      };
    }
  }

  return {
    subject: subject || 'Email',
    composeKind: 'announcement_form',
    htmlBody: '',
    formPayload: {
      ...emptyAnnouncementForm(),
      useBlocks: false,
      headline: result.headline,
      subhead: result.subhead,
      message: result.message,
      previewText,
      buttonLabel: result.buttonLabel,
      buttonUrl: sanitizeFormButtonUrl(result.buttonUrl),
      signOff: result.signOff,
      ...clearedRichBodyFields(),
    },
  };
}
