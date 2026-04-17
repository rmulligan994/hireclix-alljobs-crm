import type { AnnouncementForm, ComposeKind, ContentBlock } from '@/types/email-types';
import type { EmailAIEditorContext } from '@/lib/email/email-ai-api-client';

function summarizeBlock(b: ContentBlock): string {
  switch (b.type) {
    case 'heading':
      return `[H${b.level}] ${b.text.slice(0, 120)}`;
    case 'text':
      return `[Text] ${b.content.slice(0, 220)}`;
    case 'image':
      return `[Image] alt="${b.alt.slice(0, 40)}" ${b.url.slice(0, 100)}`;
    case 'button':
      return `[Button] ${b.label} → ${b.url}`;
    case 'divider':
      return '[Divider]';
    case 'spacer':
      return `[Spacer ${b.height}px]`;
    default:
      return '';
  }
}

/** Builds the snapshot sent to the AI so it can edit the current email, not only empty classic fields. */
export function buildEmailAIEditorContext(
  composeKind: ComposeKind,
  formPayload: AnnouncementForm,
  subject: string,
  htmlBody: string,
): EmailAIEditorContext {
  const previewText = formPayload.previewText;
  if (composeKind === 'raw_html') {
    return {
      composeKind: 'raw_html',
      useBlocks: false,
      subject,
      previewText,
      bodySummary: htmlBody.slice(0, 4000),
      htmlExcerpt: htmlBody.slice(0, 4000),
    };
  }

  if (formPayload.useBlocks && formPayload.blocks.length > 0) {
    return {
      composeKind: 'announcement_form',
      useBlocks: true,
      subject,
      previewText,
      bodySummary: formPayload.blocks.map(summarizeBlock).filter(Boolean).join('\n'),
    };
  }

  return {
    composeKind: 'announcement_form',
    useBlocks: false,
    subject,
    previewText,
    bodySummary: [
      `Eyebrow: ${formPayload.eyebrow}`,
      `Headline: ${formPayload.headline}`,
      `Subhead: ${formPayload.subhead}`,
      `Message:\n${formPayload.message.slice(0, 2500)}`,
      `Button: ${formPayload.buttonLabel} → ${formPayload.buttonUrl}`,
      `Sign-off: ${formPayload.signOff}`,
    ].join('\n'),
  };
}
