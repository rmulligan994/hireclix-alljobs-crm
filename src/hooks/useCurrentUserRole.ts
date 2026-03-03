import { useCurrentUser } from '@/hooks/useAuth';
import type { UserRole } from '@/types/User';

/**
 * Returns the current user's role (admin or recruiter).
 * Defaults to 'recruiter' if no profile or role is set.
 */
export function useCurrentUserRole(): UserRole {
  const { data: currentUser } = useCurrentUser();
  const role = currentUser?.profile?.role;
  return role === 'admin' ? 'admin' : 'recruiter';
}
