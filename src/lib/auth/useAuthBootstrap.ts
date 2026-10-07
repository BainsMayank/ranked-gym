import { useEffect } from 'react';
import { AppState } from 'react-native';

import { clearUserExerciseData } from '@/lib/exercises/repository';
import { queryClient } from '@/lib/queryClient';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import { useAuthStore } from './authStore';

/**
 * Restores the saved session, mirrors auth changes into `useAuthStore` and refreshes tokens only
 * while the app is in the foreground (React Native has no visibility events for supabase-js).
 * Mount once, in the root layout.
 */
export function useAuthBootstrap(): void {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      return;
    }
    const supabase = getSupabase();
    let active = true;

    // Offline with an expired token, getSession still returns the stored session (refresh is
    // retried later), so the app opens signed in and logging keeps working.
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Never show the next account someone else's cached data.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        void clearUserExerciseData().catch(() => undefined);
      }
    });

    const syncRefresh = (state: string) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    };
    syncRefresh(AppState.currentState);
    const appState = AppState.addEventListener('change', syncRefresh);

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, [setSession]);
}
