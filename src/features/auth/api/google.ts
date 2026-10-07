import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { getSupabase } from '@/lib/supabase';

// Closes the auth popup on web; a no-op on native.
WebBrowser.maybeCompleteAuthSession();

/**
 * Where Supabase sends the browser back to: exp://<lan-ip>:8081/--/auth/callback in Expo Go,
 * rankedgym://auth/callback in builds. Both patterns must be in Supabase → Auth → Redirect URLs.
 */
export function authRedirectUri(): string {
  return makeRedirectUri({ path: 'auth/callback' });
}

/**
 * Google sign-in through Supabase's hosted OAuth with PKCE. It runs in a system browser sheet, so it
 * works in Expo Go (no native Google SDK). Resolves 'cancelled' if the user closes the sheet.
 */
export async function signInWithGoogle(): Promise<'signedIn' | 'cancelled'> {
  const supabase = getSupabase();
  const redirectTo = authRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  const { queryParams } = Linking.parse(result.url);
  const failure = queryParams?.error_description ?? queryParams?.error;
  if (typeof failure === 'string') throw new Error(failure);
  const code = queryParams?.code;
  if (typeof code !== 'string') throw new Error('Google sign-in did not finish. Please try again.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return 'signedIn';
}
