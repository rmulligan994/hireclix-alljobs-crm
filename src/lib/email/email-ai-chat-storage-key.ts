/**
 * SessionStorage key for the campaign email AI assistant.
 * Draft flows use a per-open `draftChatSessionId` so a new campaign does not reuse chat from the previous one.
 */
export function buildEmailAiChatStorageKey(
  campaignId: string | null | undefined,
  draftChatSessionId: string | null | undefined,
  scopeSuffix: string | null | undefined,
): string {
  const suffix = scopeSuffix?.trim() ? `::${scopeSuffix.trim()}` : '';
  const cid = campaignId?.trim();
  if (cid) return `clarity-email-ai-chat::campaign::${cid}${suffix}`;
  const draft = draftChatSessionId?.trim() || 'default';
  return `clarity-email-ai-chat::draft::${draft}${suffix}`;
}

export function newEmailDraftSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
