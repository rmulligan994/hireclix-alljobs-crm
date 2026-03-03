/**
 * Campaign recipient limits by role.
 * Admin: no limit (null = unlimited)
 * Recruiter: 500 recipients max
 */

export const RECRUITER_MAX_RECIPIENTS = 500;
export const ADMIN_MAX_RECIPIENTS: number | null = null; // unlimited

export function getRecipientLimitForRole(role: 'admin' | 'recruiter'): number | null {
  return role === 'admin' ? ADMIN_MAX_RECIPIENTS : RECRUITER_MAX_RECIPIENTS;
}

export function isOverRecipientLimit(role: 'admin' | 'recruiter', count: number): boolean {
  const limit = getRecipientLimitForRole(role);
  if (limit === null) return false;
  return count > limit;
}
