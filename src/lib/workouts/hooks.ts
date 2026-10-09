import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useUserId } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { runSync } from '@/lib/sync';

import {
  loadBestE1rm,
  loadExerciseHistory,
  loadLastDone,
  loadPreviousSets,
  loadWorkoutHistory,
} from './queries';
import {
  deleteWorkout,
  discardWorkout,
  finishWorkout,
  loadActiveWorkout,
  loadWorkoutRecord,
  saveWorkoutEdit,
  setWorkoutPhoto,
} from './repository';
import { registerWorkoutSync, syncWorkouts } from './sync';
import type { WorkoutDoc } from './types';

export const workoutKeys = {
  all: ['workouts'] as const,
  active: ['workouts', 'active'] as const,
  history: ['workouts', 'history'] as const,
  record: (id: string) => ['workouts', 'record', id] as const,
  previous: (ids: readonly string[], exclude?: string) =>
    ['workouts', 'previous', exclude ?? '', ...ids] as const,
  bestE1rm: (ids: readonly string[]) => ['workouts', 'e1rm', ...ids] as const,
  exercise: (exerciseId: string) => ['workouts', 'exercise', exerciseId] as const,
  lastDone: ['workouts', 'last-done'] as const,
  sync: (userId: string) => ['workouts', 'sync', userId] as const,
};

const local = { networkMode: 'always', staleTime: Infinity } as const;

/** The workout in progress on this device (null when none). Drives the mini bar and resume. */
export function useActiveWorkout() {
  return useQuery({ queryKey: workoutKeys.active, queryFn: loadActiveWorkout, ...local });
}

export function useWorkoutHistory() {
  return useQuery({ queryKey: workoutKeys.history, queryFn: loadWorkoutHistory, ...local });
}

export function useWorkoutRecord(id: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.record(id ?? 'none'),
    queryFn: () => (id ? loadWorkoutRecord(id) : null),
    enabled: !!id,
    ...local,
    staleTime: 0,
  });
}

/** "Last time" sets per exercise (excluding the workout being logged). */
export function usePreviousSets(exerciseIds: readonly string[], excludeWorkoutId?: string) {
  const ids = [...new Set(exerciseIds)].sort();
  return useQuery({
    queryKey: workoutKeys.previous(ids, excludeWorkoutId),
    queryFn: () => loadPreviousSets(ids, excludeWorkoutId),
    ...local,
  });
}

export function useBestE1rm(exerciseIds: readonly string[]) {
  const ids = [...new Set(exerciseIds)].sort();
  return useQuery({
    queryKey: workoutKeys.bestE1rm(ids),
    queryFn: () => loadBestE1rm(ids),
    ...local,
  });
}

export function useExerciseHistory(exerciseId: string | undefined) {
  return useQuery({
    queryKey: workoutKeys.exercise(exerciseId ?? 'none'),
    queryFn: () => (exerciseId ? loadExerciseHistory(exerciseId) : []),
    enabled: !!exerciseId,
    ...local,
  });
}

export function useLastDone() {
  return useQuery({ queryKey: workoutKeys.lastDone, queryFn: loadLastDone, ...local });
}

/** After a local write: refresh what reads workouts and push in the background. */
export function afterWorkoutWrite(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  // Finishing a planned session marks its plan day done (plans read the same SQLite).
  void queryClient.invalidateQueries({ queryKey: ['plans'] });
  if (isSupabaseConfigured()) {
    registerWorkoutSync();
    void runSync();
  }
}

function useLocalMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    networkMode: 'always',
    onSuccess: () => afterWorkoutWrite(queryClient),
  });
}

export const useFinishWorkout = () =>
  useLocalMutation(({ doc, photoUri }: { doc: WorkoutDoc; photoUri: string | null }) =>
    finishWorkout(doc, photoUri),
  );
export const useDiscardWorkout = () => useLocalMutation((id: string) => discardWorkout(id));
export const useDeleteWorkout = () => useLocalMutation((id: string) => deleteWorkout(id));
export const useSaveWorkoutEdit = () => useLocalMutation((doc: WorkoutDoc) => saveWorkoutEdit(doc));
export const useSetWorkoutPhoto = () =>
  useLocalMutation(({ id, uri }: { id: string; uri: string | null }) => setWorkoutPhoto(id, uri));

/**
 * Keeps finished workouts in step with Supabase: pushes pending changes and pulls on launch and
 * on every return to the foreground. Mounted by the tab layout. Offline it fails and retries.
 */
export function useWorkoutSync() {
  registerWorkoutSync();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: workoutKeys.sync(userId ?? 'signed-out'),
    queryFn: async () => {
      const result = await syncWorkouts();
      if (result.downloaded || result.removed) {
        await queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      }
      return result;
    },
    enabled: !!userId && isSupabaseConfigured(),
    networkMode: 'online',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { refetch } = query;
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => sub.remove();
  }, [userId, refetch]);

  return query;
}
