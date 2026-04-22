export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'recruiter';

export interface Profile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  role?: UserRole;
  /** Admins (Team): when true, all of this user’s org-shared campaigns appear in Organization; when false, each campaign can opt in. */
  forceShowInOrgTab?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}
