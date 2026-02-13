import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services';
import type { SignUpData, SignInData, AuthUser } from '@/types';
import { toast } from 'sonner';

/**
 * React Query hooks for authentication
 */

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = userService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // THEN check for existing session
    userService.getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated: !!user };
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: userService.getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => userService.getProfile(userId),
    enabled: !!userId,
  });
};

export const useAllProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => userService.getAllProfiles(),
    staleTime: 0, // Always fetch fresh - never use cached team list
  });
};

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignUpData) => userService.signUp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Account created successfully! Please check your email to verify.');
    },
    onError: (error: Error) => {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(`Sign up failed: ${error.message}`);
      }
    },
  });
};

export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInData) => userService.signIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Signed in successfully!');
    },
    onError: (error: Error) => {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(`Sign in failed: ${error.message}`);
      }
    },
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.signOut,
    onSuccess: () => {
      queryClient.clear();
      toast.success('Signed out successfully');
    },
    onError: (error: Error) => {
      toast.error(`Sign out failed: ${error.message}`);
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Parameters<typeof userService.updateProfile>[1] }) => 
      userService.updateProfile(userId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: (email: string) => userService.resetPassword(email),
    onSuccess: () => {
      toast.success('Password reset email sent! Please check your inbox.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send reset email: ${error.message}`);
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (newPassword: string) => userService.updatePassword(newPassword),
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update password: ${error.message}`);
    },
  });
};
