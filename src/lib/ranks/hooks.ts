import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/lib/auth/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSyncStatusStore } from '@/lib/sync';
import { loadWorkoutRewards, saveWorkoutRewards } from '@/lib/workouts/repository';

import type { RankScope } from '@/lib/game/engine/types';

import { fetchRankPredictions, fetchRanks, fetchWorkoutRewards } from './api';
import { fetchLiftBests } from './bests';
import { fetchRankEvents, fetchRankHistory, rangeStart, type HistoryRange } from './history';
import { fetchRankLadder, fetchRankLifts } from './ladder';
import { fetchLiftDetail, fetchLiftPercentile } from './liftDetail';
import { parseRewards } from './parse';
import { fetchPersonalRecords } from './records';
import type { WorkoutRewards } from './types';

export const rankQueryKeys = {
  all: ['ranks'] as const,
  rewards: (workoutId: string) => ['ranks', 'rewards', workoutId] as const,
  current: ['ranks', 'current'] as const,
  predictions: ['ranks', 'predictions'] as const,
  ladder: ['ranks', 'ladder'] as const,
  bests: ['ranks', 'bests'] as const,
  lifts: ['ranks', 'lifts'] as const,
  history: (scope: RankScope, key: string, range: HistoryRange) =>
    ['ranks', 'history', scope, key, range] as const,
  events: ['ranks', 'events'] as const,
  records: ['ranks', 'records'] as const,
  liftDetail: (rankKey: string) => ['ranks', 'lift', rankKey] as const,
  percentile: (rankKey: string) => ['ranks', 'percentile', rankKey] as const,
};

/** Server rank reads need a signed-in account (the dev preview browses signed out). */
export function useServerReads(): boolean {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  return isSupabaseConfigured() && signedIn;
}

const DAY = 24 * 60 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

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

/** Current ranks (server). */
export function useRanks() {
  return useQuery({
    queryKey: rankQueryKeys.current,
    queryFn: fetchRanks,
    enabled: useServerReads(),
  });
}

/** Next-division targets and ETAs per lift (server). */
export function useRankPredictions() {
  return useQuery({
    queryKey: rankQueryKeys.predictions,
    queryFn: fetchRankPredictions,
    enabled: useServerReads(),
  });
}

/** Tier thresholds and engine settings (configuration; changes with a standards release). */
export function useRankLadder() {
  return useQuery({
    queryKey: rankQueryKeys.ladder,
    queryFn: fetchRankLadder,
    enabled: useServerReads(),
    staleTime: DAY,
    gcTime: DAY,
  });
}

/** Every rankable lift with its name and discipline. */
export function useRankLifts() {
  return useQuery({
    queryKey: rankQueryKeys.lifts,
    queryFn: fetchRankLifts,
    enabled: useServerReads(),
    staleTime: DAY,
    gcTime: DAY,
  });
}

/** Snapshots and rank events of one scope over a range (progression chart). */
export function useRankHistory(scope: RankScope, key: string, range: HistoryRange) {
  return useQuery({
    queryKey: rankQueryKeys.history(scope, key, range),
    queryFn: () => fetchRankHistory(scope, key, rangeStart(range)),
    enabled: useServerReads(),
    staleTime: FIVE_MINUTES,
  });
}

/** Every rank event (Analysis: rank-ups by weekday and time of day). */
export function useRankEvents() {
  return useQuery({
    queryKey: rankQueryKeys.events,
    queryFn: () => fetchRankEvents(new Date(0).toISOString()),
    enabled: useServerReads(),
    staleTime: FIVE_MINUTES,
  });
}

/** Record history for every exercise (Records tab, exercise detail). */
export function usePersonalRecords() {
  return useQuery({
    queryKey: rankQueryKeys.records,
    queryFn: fetchPersonalRecords,
    enabled: useServerReads(),
    staleTime: FIVE_MINUTES,
  });
}

/** One lift in detail: sets that counted, history, standards. */
export function useLiftDetail(rankKey: string | undefined) {
  return useQuery({
    queryKey: rankQueryKeys.liftDetail(rankKey ?? 'none'),
    queryFn: () => (rankKey ? fetchLiftDetail(rankKey) : null),
    enabled: useServerReads() && !!rankKey,
    staleTime: FIVE_MINUTES,
  });
}

/** Percentile among lifters of the same standards sex and bodyweight band (20+ needed). */
export function useLiftPercentile(rankKey: string | undefined) {
  return useQuery({
    queryKey: rankQueryKeys.percentile(rankKey ?? 'none'),
    queryFn: () => (rankKey ? fetchLiftPercentile(rankKey) : null),
    enabled: useServerReads() && !!rankKey,
    staleTime: 60 * 60 * 1000,
  });
}

/** The set behind each ranked lift. */
export function useLiftBests() {
  return useQuery({
    queryKey: rankQueryKeys.bests,
    queryFn: fetchLiftBests,
    enabled: useServerReads(),
  });
}
