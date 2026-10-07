import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import type { Database } from '@/types/database';

import { secureStorage } from './auth/secureStorage';

interface SupabaseExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export type AppSupabaseClient = SupabaseClient<Database>;

export function readSupabaseConfig(extra: unknown): { url: string; anonKey: string } | null {
  const { supabaseUrl, supabaseAnonKey } = (extra ?? {}) as SupabaseExtra;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

let client: AppSupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig(Constants.expoConfig?.extra) !== null;
}

/**
 * Lazily creates the Supabase client. Throws a clear error if .env is missing so the
 * rest of the app (which works offline-first) still boots without credentials.
 *
 * Sessions persist in SecureStore (Keychain / Keystore). Token refresh runs only while the app is
 * in the foreground; see `useAuthBootstrap`.
 */
export function getSupabase(): AppSupabaseClient {
  if (client) return client;
  const config = readSupabaseConfig(Constants.expoConfig?.extra);
  if (!config) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env, set SUPABASE_URL and SUPABASE_ANON_KEY, then restart `pnpm start`.',
    );
  }
  client = createClient<Database>(config.url, config.anonKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE for the Google browser flow; the code verifier is kept in secureStorage.
      flowType: 'pkce',
    },
  });
  return client;
}
