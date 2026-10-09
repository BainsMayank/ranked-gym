import { useQuery } from '@tanstack/react-query';

import { isSupabaseConfigured } from '@/lib/supabase';
import { useSyncStatusStore } from '@/lib/sync';
import { loadWorkoutRewards, saveWorkoutRewards } from '@/lib/workouts/repository';

import { fetchRankPredictions, fetchRanks, fetchWorkoutRewards } from './api';
import { parseRewards } from './parse';
import type { WorkoutRewards } from './types';

export const rankQueryKeys = {
  all: ['ranks'] as const,
  rewards: (workoutId: string) => ['ranks', 'rewards', workoutId] as const,
  current: ['ranks', 'current'] as const,
  predictions: ['ranks', 'predictions'] as const,
};

export type RewardsState =
  /** The workout hasn't reached the server yet. */
  | { status: 'pending' }
  | { status: 'ready'; rewards: WorkoutRewards }
  /** Synced, but no rewards came back (offline, or scoring was queued for later). */
  | { status: 'unavailable' };

/** Local copy first (saved by the workout sync); asks the server once the workout has synced. */
export async function loadRewardsState(workoutId: string): Promise<RewardsState> {
  const local = await loadWorkoutRewards(workoutId);
  const parsed = parseRewards(local?.rewards ?? null);
  if (parsed) return { status: 'ready', rewards: parsed };
  if (local && local.pushedAt === null) return { status: 'pending' };
  if (!isSupabaseConfigured() || !useSyncStatusStore.getState().online) {
    return { status: 'unavailable' };
  }
  try {
    const raw = await fetchWorkoutRewards(workoutId);
    const remote = parseRewards(raw);
    if (!remote) return { status: 'unavailable' };
    if (local) await saveWorkoutRewards(workoutId, raw);
    return { status: 'ready', rewards: remote };
  } catch {
    return { status: 'unavailable' };
  }
}

/** What a finished workout earned. Refreshes when the workout sync stores new rewards. */
export function useWorkoutRewards(workoutId: string | undefined) {
  return useQuery({
    queryKey: rankQueryKeys.rewards(workoutId ?? 'none'),
    queryFn: () => (workoutId ? loadRewardsState(workoutId) : { status: 'unavailable' as const }),
    enabled: !!workoutId,
    networkMode: 'always',
    staleTime: 0,
  });
}

/** Current ranks (server). The Rank tab uses these in Phase 7. */
export function useRanks() {
  return useQuery({
    queryKey: rankQueryKeys.current,
    queryFn: fetchRanks,
    enabled: isSupabaseConfigured(),
  });
}

/** Next-division targets and ETAs per lift (server). */
export function useRankPredictions() {
  return useQuery({
    queryKey: rankQueryKeys.predictions,
    queryFn: fetchRankPredictions,
    enabled: isSupabaseConfigured(),
  });
}
