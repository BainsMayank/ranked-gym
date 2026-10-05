import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

interface SupabaseExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export function readSupabaseConfig(extra: unknown): { url: string; anonKey: string } | null {
  const { supabaseUrl, supabaseAnonKey } = (extra ?? {}) as SupabaseExtra;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

let client: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig(Constants.expoConfig?.extra) !== null;
}

/**
 * Lazily creates the Supabase client. Throws a clear error if .env is missing so the
 * rest of the app (which works offline-first) still boots without credentials.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const config = readSupabaseConfig(Constants.expoConfig?.extra);
  if (!config) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env, set SUPABASE_URL and SUPABASE_ANON_KEY, then restart `pnpm start`.',
    );
  }
  client = createClient(config.url, config.anonKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
