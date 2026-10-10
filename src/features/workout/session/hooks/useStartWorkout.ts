import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useUserId } from '@/lib/auth';
import { loadPlanDaySource } from '@/lib/plans';
import { readCachedBodyweight, useProfile } from '@/lib/profile';
import { loadRoutineDoc } from '@/lib/routines';
import {
  blankWorkout,
  discardWorkout,
  elapsedSec,
  loadBestE1rm,
  planFromRoutine,
  saveActiveWorkout,
  startWorkout,
  workoutKeys,
  type PlanSource,
  type StartContext,
} from '@/lib/workouts';

import { cancelPendingSave, skipRest } from '../controller';
import { activeSession } from '../store';

export type StartSource =
  | { kind: 'empty' }
  | { kind: 'routine'; routineId: string }
  | { kind: 'plan'; plan: PlanSource }
  /** Today's (or any) session of the active plan: progression applied, linked to the day. */
  | { kind: 'planDay'; planDayId: string };

/**
 * Starts a workout and opens the logging screen. Only one can be in progress: if one is, the lifter
 * chooses to go back to it or discard it and start the new one.
 */
export function useStartWorkout() {
  const router = useRouter();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  async function begin(source: StartSource): Promise<void> {
    const now = new Date().toISOString();
    let plan: PlanSource | null = null;
    if (source.kind === 'routine') {
      const routine = await loadRoutineDoc(source.routineId);
      if (!routine) return;
      plan = planFromRoutine(routine);
    } else if (source.kind === 'plan') {
      plan = source.plan;
    } else if (source.kind === 'planDay') {
      plan = await loadPlanDaySource(source.planDayId);
      if (!plan) return;
    }
    const best = plan ? await loadBestE1rm(plan.exercises.map((e) => e.exerciseId)) : new Map();
    const ctx: StartContext = {
      id: randomUUID(),
      now,
      newId: randomUUID,
      bodyweightKg: readCachedBodyweight(userId ?? 'device-preview'),
      visibility: profile?.visibility ?? 'friends',
      oneRepMax: (id) => best.get(id) ?? null,
    };
    const doc = plan ? startWorkout(plan, ctx) : blankWorkout(ctx);
    await saveActiveWorkout(doc, { rest: null });
    activeSession.getState().load(doc);
    void queryClient.invalidateQueries({ queryKey: workoutKeys.active });
    router.push('/session');
  }

  return function start(source: StartSource): void {
    const current = activeSession.getState().doc;
    if (!current) {
      void begin(source);
      return;
    }
    const minutes = Math.round(elapsedSec(current.startedAt, null) / 60);
    Alert.alert(
      'A workout is already going',
      `“${current.name}” started ${minutes} min ago. You can log one workout at a time.`,
      [
        { text: 'Keep logging it', onPress: () => router.push('/session') },
        {
          text: 'Discard it and start new',
          style: 'destructive',
          onPress: () =>
            void (async () => {
              await cancelPendingSave();
              skipRest(activeSession);
              await discardWorkout(current.id);
              activeSession.getState().reset();
              await begin(source);
            })(),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };
}
