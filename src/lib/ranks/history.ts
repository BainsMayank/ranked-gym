import type { Rank } from '@/lib/game/ranks';
import { rankScopes, type RankScope } from '@/lib/game/engine/types';
import { getSupabase } from '@/lib/supabase';

import { isObj, num, oneOf, parseList, rank, str } from './json';
import type { RankChangeKind } from './types';

/**
 * Rank history: snapshots for the progression chart and events (placed, rank-up, rank-down) timed
 * by the workout that caused them (`get_rank_history`, `get_rank_events`).
 */

export const historyRanges = ['1M', '3M', '6M', '1Y', 'All'] as const;
export type HistoryRange = (typeof historyRanges)[number];

const RANGE_DAYS: Record<HistoryRange, number | null> = {
  '1M': 30,
  '3M': 91,
  '6M': 182,
  '1Y': 365,
  All: null,
};

/** Start of a range as an ISO instant (the epoch for All). */
export function rangeStart(range: HistoryRange, now = Date.now()): string {
  const days = RANGE_DAYS[range];
  return new Date(days === null ? 0 : now - days * 86_400_000).toISOString();
}

export interface RankSnapshot {
  at: string;
  score: number;
  rank: Rank;
}

export interface RankEvent {
  scope: RankScope;
  key: string;
  kind: RankChangeKind;
  from: Rank | null;
  to: Rank;
  score: number;
  /** When the workout that caused it started (or when it was computed, for background runs). */
  at: string;
  workoutId: string | null;
}

export interface RankHistory {
  snapshots: RankSnapshot[];
  events: Pick<RankEvent, 'kind' | 'from' | 'to' | 'score' | 'at'>[];
}

const EVENT_KINDS = ['placed', 'rank_up', 'rank_down'] as const satisfies RankChangeKind[];

function parseSnapshot(v: unknown): RankSnapshot | null {
  if (!isObj(v)) return null;
  const at = str(v.at);
  const score = num(v.score);
  const r = rank(v.tier, v.division);
  if (!at || score === null || !r) return null;
  return { at, score, rank: r };
}

function parseEventCore(v: unknown): RankHistory['events'][number] | null {
  if (!isObj(v)) return null;
  const kind = oneOf(EVENT_KINDS, v.kind);
  const to = rank(v.to_tier, v.to_division);
  const at = str(v.at);
  const score = num(v.score);
  if (!kind || !to || !at || score === null) return null;
  return { kind, from: rank(v.from_tier, v.from_division), to, score, at };
}

export function parseRankEvent(v: unknown): RankEvent | null {
  const core = parseEventCore(v);
  if (!core || !isObj(v)) return null;
  const scope = oneOf(rankScopes, v.scope);
  const key = str(v.key);
  if (!scope || !key) return null;
  return { ...core, scope, key, workoutId: str(v.workout_id) };
}

export function parseRankHistory(v: unknown): RankHistory {
  if (!isObj(v)) return { snapshots: [], events: [] };
  return {
    snapshots: parseList(v.snapshots, parseSnapshot),
    events: parseList(v.events, parseEventCore),
  };
}

export async function fetchRankHistory(
  scope: RankScope,
  key: string,
  since: string,
): Promise<RankHistory> {
  const { data, error } = await getSupabase().rpc('get_rank_history', {
    p_scope: scope,
    p_key: key,
    p_since: since,
  });
  if (error) throw error;
  return parseRankHistory(data);
}

export async function fetchRankEvents(since: string): Promise<RankEvent[]> {
  const { data, error } = await getSupabase().rpc('get_rank_events', { p_since: since });
  if (error) throw error;
  return parseList(data, parseRankEvent);
}
