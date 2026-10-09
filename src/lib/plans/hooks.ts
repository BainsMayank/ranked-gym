import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useUserId } from '@/lib/auth';
import { routineKeys } from '@/lib/routines/hooks';
import type { RoutineDoc } from '@/lib/routines/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { runSync } from '@/lib/sync';

import type { PlanDoc } from './engine/types';
import { createPlan, loadActivePlan, loadPlanDay, savePlan } from './repository';
import { registerPlanSync, syncPlans } from './sync';

export const planKeys = {
  all: ['plans'] as const,
  active: ['plans', 'active'] as const,
  day: (id: string) => ['plans', 'day', id] as const,
  sync: (userId: string) => ['plans', 'sync', userId] as const,
};

const local = { networkMode: 'always', staleTime: Infinity } as const;

/** The active plan on this device (null when none). Works offline. */
export function useActivePlan() {
  return useQuery({ queryKey: planKeys.active, queryFn: loadActivePlan, ...local });
}

export function usePlanDay(dayId: string | undefined) {
  return useQuery({
    queryKey: planKeys.day(dayId ?? 'none'),
    queryFn: () => (dayId ? loadPlanDay(dayId) : null),
    enabled: !!dayId,
    ...local,
  });
}

/** After a local write: refresh plans (and routines, which plan edits change) and push. */
export function afterPlanWrite(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: planKeys.all });
  void queryClient.invalidateQueries({ queryKey: routineKeys.all });
  if (isSupabaseConfigured()) {
    registerPlanSync();
    void runSync();
  }
}

function useLocalMutation<T>(fn: (input: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    networkMode: 'always',
    onSuccess: () => afterPlanWrite(queryClient),
  });
}

export const useCreatePlan = () =>
  useLocalMutation((input: { doc: PlanDoc; routines: RoutineDoc[]; today: string }) =>
    createPlan(input.doc, input.routines, { today: input.today }),
  );

export const useSavePlan = () =>
  useLocalMutation((input: { doc: PlanDoc; routines?: RoutineDoc[] }) =>
    savePlan(input.doc, input.routines),
  );

/** Keeps plans in step with Supabase on launch and on every return to the foreground. */
export function usePlanSync() {
  registerPlanSync();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: planKeys.sync(userId ?? 'signed-out'),
    queryFn: async () => {
      const result = await syncPlans();
      if (result.downloaded || result.removed) {
        await queryClient.invalidateQueries({ queryKey: planKeys.all });
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
