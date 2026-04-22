import type { Profile } from '@/types/User';

/** Display name for a profile row, with stable fallbacks. */
export function profileDisplayName(
  profile: Pick<Profile, 'firstName' | 'lastName' | 'email'> | undefined,
  fallbackUserId?: string
): string {
  if (!profile) {
    return fallbackUserId ? `User ${fallbackUserId.slice(0, 8)}` : 'Unknown';
  }
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const e = profile.email?.trim();
  if (e) return e;
  return fallbackUserId ? `User ${fallbackUserId.slice(0, 8)}` : 'Unknown';
}
