import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isDevAuthBypassEnabled } from './devBypass';

/**
 * `loading` until the stored session has been read (the splash stays up), then signed in or out.
 * Supabase owns the session itself; this mirrors it so routes and hooks can react.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /**
   * Dev only: browse the app without an account, using local data and existing preview fallbacks.
   * Never available in release builds.
   */
  preview: boolean;
  setSession: (session: Session | null) => void;
  setPreview: (preview: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  preview: false,
  setSession: (session) =>
    set({
      session,
      status: session ? 'signedIn' : 'signedOut',
      preview: !session && isDevAuthBypassEnabled(),
    }),
  setPreview: (preview) => set({ preview: __DEV__ && preview }),
}));

/** The signed-in user's id, or undefined. */
export function useUserId(): string | undefined {
  return useAuthStore((s) => s.session?.user.id);
}
