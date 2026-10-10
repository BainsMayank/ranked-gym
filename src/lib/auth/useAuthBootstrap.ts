import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { clearUserExerciseData } from '@/lib/exercises/repository';
import { clearPlanData } from '@/lib/plans/repository';
import { clearRoutineData } from '@/lib/routines/repository';
import { clearQueue } from '@/lib/sync/queue';
import { stopSync, waitForSync } from '@/lib/sync/runner';
import { clearWorkoutData } from '@/lib/workouts/repository';
import { queryClient } from '@/lib/queryClient';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

import { useAuthStore } from './authStore';
import { clearAccountCache } from './accountCache';

/**
 * Restores the saved session, mirrors auth changes into `useAuthStore` and refreshes tokens only
 * while the app is in the foreground (React Native has no visibility events for supabase-js).
 * Mount once, in the root layout.
 */
export function useAuthBootstrap(beforeClear?: () => Promise<void>): void {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      return;
    }
    const supabase = getSupabase();
    let active = true;
    let receivedEvent = false;
    let account = useAuthStore.getState().session?.user.id;
    let transition = Promise.resolve();

    const receive = (session: Session | null) => {
      const previous = account;
      account = session?.user.id;
      if (previous && previous !== account) {
        // Close protected screens before asynchronously clearing the old account.
        useAuthStore.setState({ status: 'loading', session: null, preview: false });
        stopSync();
        queryClient.clear();
        transition = transition.then(async () => {
          await beforeClear?.();
          await waitForSync();
          clearAccountCache(previous);
          await clearQueue();
          await clearPlanData();
          await clearWorkoutData();
          await clearRoutineData();
          await clearUserExerciseData();
        });
      }
      // Run after the synchronous auth listener returns, outside Supabase's auth lock.
      transition = transition.then(() => {
        if (active && account === session?.user.id) setSession(session);
      });
      void transition.catch((error: unknown) => {
        // Fail closed: another session must never open over uncleared account data.
        console.error('Could not prepare local account data', error);
      });
    };

    // Offline with an expired token, getSession still returns the stored session (refresh is
    // retried later), so the app opens signed in and logging keeps working.
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !receivedEvent) receive(data.session);
      })
      .catch(() => {
        if (active && !receivedEvent) receive(null);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      receive(session);
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
  }, [setSession, beforeClear]);
}
