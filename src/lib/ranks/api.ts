import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

import { parseCurrentRank, parsePrediction } from './parse';
import type { CurrentRank, RankPrediction } from './types';

/** A workout's rewards as the server stored them (raw JSON; null until synced and scored). */
export async function fetchWorkoutRewards(workoutId: string): Promise<Json | null> {
  const { data, error } = await getSupabase().rpc('get_workout_rewards', {
    p_workout: workoutId,
  });
  if (error) throw error;
  return data ?? null;
}

/** The signed-in user's current ranks (with Inactive after 60 days without rankable sets). */
export async function fetchRanks(): Promise<CurrentRank[]> {
  const { data, error } = await getSupabase().rpc('get_ranks');
  if (error) throw error;
  return (data ?? []).map(parseCurrentRank).filter((r): r is CurrentRank => r !== null);
}

/** For each ranked lift: what the next division needs, and when at the current pace. */
export async function fetchRankPredictions(): Promise<RankPrediction[]> {
  const { data, error } = await getSupabase().rpc('get_rank_predictions');
  if (error) throw error;
  return (Array.isArray(data) ? data : [])
    .map(parsePrediction)
    .filter((p): p is RankPrediction => p !== null);
}
