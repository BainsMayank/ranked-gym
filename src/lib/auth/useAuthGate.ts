import { useMemo } from 'react';

import { readOnboarded } from '@/lib/profile/onboardedCache';
import { useProfile } from '@/lib/profile/useProfile';

import { useAuthStore, useUserId } from './authStore';
import { isDevAuthBypassEnabled } from './devBypass';

/** Which part of the app someone may see. `loading` keeps the splash screen up. */
export type GateScreen = 'loading' | 'auth' | 'onboarding' | 'app';

/**
 * Signed out → auth stack. Signed in → onboarding until `onboarded_at` is set, then the app.
 * Offline cold starts use the locally cached onboarded flag so the app still opens without network.
 * The development bypass also skips onboarding for a restored account, without changing its profile.
 */
export function useAuthGate(): { screen: GateScreen } {
  const status = useAuthStore((s) => s.status);
  const preview = useAuthStore((s) => s.preview);
  const userId = useUserId();
  const profile = useProfile();
  const cachedOnboarded = useMemo(() => (userId ? readOnboarded(userId) : false), [userId]);

  let screen: GateScreen;
  if (preview) screen = 'app';
  else if (status === 'loading') screen = 'loading';
  else if (status === 'signedOut') screen = 'auth';
  else if (isDevAuthBypassEnabled()) screen = 'app';
  else if (profile.data) screen = profile.data.onboarded_at ? 'app' : 'onboarding';
  else if (cachedOnboarded) screen = 'app';
  // Couldn't load the profile (offline or an error): onboarding shows the problem and a retry.
  else if (profile.isError || profile.fetchStatus === 'paused') screen = 'onboarding';
  else screen = 'loading';

  return { screen };
}
