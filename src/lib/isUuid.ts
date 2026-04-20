const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True for standard UUID strings (campaign_emails.id, etc.). */
export function isUuid(s: string | undefined | null): boolean {
  return typeof s === 'string' && UUID_RE.test(s);
}
