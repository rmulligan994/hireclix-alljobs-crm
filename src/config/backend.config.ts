/**
 * Backend Configuration
 * 
 * This file contains configuration for the backend provider.
 * To swap backends, change the provider and update the corresponding
 * service implementations.
 * 
 * Supported providers:
 * - 'lovable' (default): Uses Lovable Cloud (Supabase under the hood)
 * - 'supabase': Direct Supabase connection
 * - 'firebase': Firebase/Firestore
 * - 'custom': Custom REST API
 */

export type BackendProvider = 'lovable' | 'supabase' | 'firebase' | 'custom';

export interface BackendConfig {
  provider: BackendProvider;
  apiUrl: string;
  enableRealtime: boolean;
  enableOfflineMode: boolean;
}

export const backendConfig: BackendConfig = {
  provider: 'lovable',
  apiUrl: import.meta.env.VITE_SUPABASE_URL || '',
  enableRealtime: true,
  enableOfflineMode: false,
};

/**
 * Helper to check if using Lovable/Supabase backend
 */
export const isLovableBackend = (): boolean => {
  return backendConfig.provider === 'lovable' || backendConfig.provider === 'supabase';
};
