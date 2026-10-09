import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';

import { useUserId } from '@/lib/auth';
import { loadActiveWorkout } from '@/lib/workouts';

import { finishRest } from '../controller';
import { activeSession } from '../store';

/**
 * Mounted once by the tab layout. Restores the workout in progress after a kill or a restart (the
 * mini bar then offers to resume it) and ends the rest timer on time while the app is open.
 */
export function useActiveSessionBoot(): void {
  const userId = useUserId();

  useEffect(() => {
    if (!userId || activeSession.getState().doc) return;
    let cancelled = false;
    void loadActiveWorkout().then((record) => {
      if (cancelled || !record || activeSession.getState().doc) return;
      // A rest that ran out while the app was closed is simply over (the notification buzzed).
      const rest =
        record.runtime.rest && record.runtime.rest.endsAt > Date.now() ? record.runtime.rest : null;
      activeSession.getState().load(record.doc, { ...record.runtime, rest });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const endsAt = useStore(activeSession, (s) => s.runtime.rest?.endsAt ?? null);
  useEffect(() => {
    if (endsAt === null) return;
    const fire = () => {
      if (activeSession.getState().runtime.rest?.endsAt === endsAt) finishRest(activeSession);
    };
    const wait = endsAt - Date.now();
    if (wait <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, wait);
    // Timers pause in the background; check again on return.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() >= endsAt) {
        const rest = activeSession.getState().runtime.rest;
        if (rest?.endsAt === endsAt) activeSession.getState().setRest(null);
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [endsAt]);
}
