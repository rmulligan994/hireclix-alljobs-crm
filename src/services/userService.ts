import { supabase } from '@/integrations/supabase/client';
import type { User, Profile, AuthUser, SignUpData, SignInData } from '@/types/User';

/**
 * User Service
 * 
 * Handles all authentication and user-related database operations.
 * This is the ONLY place where auth calls should exist.
 */

const mapRowToProfile = (row: any): Profile => ({
  id: row.id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  title: row.title,
  company: row.company,
  linkedinUrl: row.linkedin_url,
  avatarUrl: row.avatar_url,
  role: row.role === 'admin' ? 'admin' : 'recruiter',
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const userService = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignUpData): Promise<AuthUser> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Sign up failed');

    return {
      id: authData.user.id,
      email: authData.user.email || '',
    };
  },

  /**
   * Sign in a user
   */
  signIn: async (data: SignInData): Promise<AuthUser> => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('Sign in failed');

    return {
      id: authData.user.id,
      email: authData.user.email || '',
    };
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current user
   */
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email || '',
      profile: profile ? mapRowToProfile(profile) : undefined,
    };
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get all user profiles (for Team list)
   */
  getAllProfiles: async (): Promise<Profile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToProfile);
  },

  /**
   * Get user profile
   */
  getProfile: async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRowToProfile(data) : null;
  },

  /**
   * Update user profile
   */
  updateProfile: async (userId: string, data: Partial<Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Profile> => {
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.linkedinUrl !== undefined) updateData.linkedin_url = data.linkedinUrl;
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl;
    if (data.role !== undefined) updateData.role = data.role;

    const { data: result, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return mapRowToProfile(result);
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
        });
      } else {
        callback(null);
      }
    });
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Update password
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },
};
