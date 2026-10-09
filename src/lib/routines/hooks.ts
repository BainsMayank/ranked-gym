import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useUserId } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { runSync } from '@/lib/sync';

import {
  deleteFolder,
  deleteRoutine,
  loadFolders,
  loadRoutineDoc,
  loadRoutineList,
  patchRoutines,
  reorderFolders,
  saveFolder,
  saveRoutineDoc,
  type RoutinePatch,
} from './repository';
import { registerRoutineSync, syncRoutines } from './sync';
import type { RoutineDoc, RoutineFolder } from './types';

export const routineKeys = {
  all: ['routines'] as const,
  list: ['routines', 'list'] as const,
  folders: ['routines', 'folders'] as const,
  doc: (id: string) => ['routines', 'doc', id] as const,
  sync: (userId: string) => ['routines', 'sync', userId] as const,
};

const local = { networkMode: 'always', staleTime: Infinity } as const;

/** Every routine on this device (archived included), from SQLite. Works offline. */
export function useRoutineList() {
  return useQuery({ queryKey: routineKeys.list, queryFn: loadRoutineList, ...local });
}

export function useRoutineFolders() {
  return useQuery({ queryKey: routineKeys.folders, queryFn: loadFolders, ...local });
}

export function useRoutineDoc(id: string | undefined) {
  return useQuery({
    queryKey: routineKeys.doc(id ?? 'none'),
    queryFn: () => (id ? loadRoutineDoc(id) : null),
    enabled: !!id,
    ...local,
    // A cheap local read: fetch fresh each time the editor opens (a sync may have just landed).
    staleTime: 0,
  });
}

/** After a local write: refresh the lists and push in the background. */
function afterWrite(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: routineKeys.all });
  if (isSupabaseConfigured()) {
    registerRoutineSync();
    void runSync();
  }
}

function useLocalMutation<T>(fn: (input: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    networkMode: 'always',
    onSuccess: () => afterWrite(queryClient),
  });
}

export const useSaveRoutine = () => useLocalMutation((doc: RoutineDoc) => saveRoutineDoc(doc));
export const useDeleteRoutine = () => useLocalMutation((id: string) => deleteRoutine(id));
export const usePatchRoutines = () =>
  useLocalMutation((changes: { id: string; patch: RoutinePatch }[]) => patchRoutines(changes));
export const useSaveFolder = () => useLocalMutation((folder: RoutineFolder) => saveFolder(folder));
export const useDeleteFolder = () => useLocalMutation((id: string) => deleteFolder(id));
export const useReorderFolders = () => useLocalMutation((ids: string[]) => reorderFolders(ids));

/**
 * Keeps routines in step with Supabase: pushes pending changes and pulls on launch and whenever the
 * app returns to the foreground. Mounted by the tab layout. Offline it simply fails and retries.
 */
export function useRoutineSync() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: routineKeys.sync(userId ?? 'signed-out'),
    queryFn: async () => {
      const result = await syncRoutines();
      await queryClient.invalidateQueries({ queryKey: routineKeys.list });
      await queryClient.invalidateQueries({ queryKey: routineKeys.folders });
      if (result.downloaded || result.removed) {
        await queryClient.invalidateQueries({ queryKey: ['routines', 'doc'] });
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
