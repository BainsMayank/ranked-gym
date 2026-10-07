import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

import { exerciseKeys } from './keys';
import { loadExercises, loadExerciseUsage, recordExerciseUse } from './repository';
import { syncExerciseLibrary } from './sync';
import type { Exercise } from './types';

const HOUR = 60 * 60 * 1000;

/**
 * Keeps the local library in step with the server. Mounted by the tab layout so it runs on launch;
 * screens may call it too to read the sync state (the query is shared). Offline it simply waits.
 */
export function useExerciseLibrarySync() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: exerciseKeys.sync(userId ?? 'signed-out'),
    queryFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const result = await syncExerciseLibrary(userId);
      await queryClient.invalidateQueries({ queryKey: exerciseKeys.library });
      return result;
    },
    enabled: !!userId && isSupabaseConfigured(),
    networkMode: 'online',
    staleTime: HOUR,
  });
}

/** The whole local library (official + custom), read from SQLite. Works offline. */
export function useExercises() {
  return useQuery({
    queryKey: exerciseKeys.library,
    queryFn: loadExercises,
    networkMode: 'always',
    staleTime: Infinity,
  });
}

const selectById = (id: string | undefined) => (list: Exercise[]) =>
  list.find((exercise) => exercise.id === id) ?? null;

export function useExercise(id: string | undefined) {
  return useQuery({
    queryKey: exerciseKeys.library,
    queryFn: loadExercises,
    networkMode: 'always',
    staleTime: Infinity,
    select: selectById(id),
  });
}

/** Local pick counts, most recent first. */
export function useExerciseUsage() {
  return useQuery({
    queryKey: exerciseKeys.usage,
    queryFn: loadExerciseUsage,
    networkMode: 'always',
    staleTime: Infinity,
  });
}

export function useRecordExerciseUse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => recordExerciseUse(ids),
    networkMode: 'always',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exerciseKeys.usage }),
  });
}
