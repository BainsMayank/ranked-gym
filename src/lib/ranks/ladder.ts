import { sortThresholds, tierFor, type TierPosition } from '@/lib/game/engine/tiers';
import type { Discipline, Threshold } from '@/lib/game/engine/types';
import { disciplines } from '@/lib/game/engine/types';
import { getSupabase } from '@/lib/supabase';

import { isObj, num, oneOf, parseList, str, tier } from './json';

/**
 * The ladder the server ranks on (`rank_thresholds` for the active standards version) and the
 * rankable lifts (`rank_lifts`). Both are configuration, read once a day; they turn a server score
 * into "x pts to Gold I" and lift keys into names.
 */

export interface RankLadder {
  version: number;
  thresholds: Threshold[];
  maxScore: number;
  windowDays: number;
  inactiveDays: number;
}

export interface RankLift {
  rankKey: string;
  name: string;
  discipline: Discipline;
}

function parseThreshold(v: unknown): Threshold | null {
  if (!isObj(v)) return null;
  const t = tier(v.tier);
  const minScore = num(v.min_score);
  if (!t || minScore === null) return null;
  const d = num(v.division);
  const division = d === 1 || d === 2 || d === 3 ? d : null;
  if (t !== 'champion' && division === null) return null;
  return { tier: t, division, minScore };
}

export async function fetchRankLadder(): Promise<RankLadder> {
  const supabase = getSupabase();
  const settings = await supabase
    .from('rank_settings')
    .select('active_standards_version, max_score, window_days, inactive_days')
    .single();
  if (settings.error) throw settings.error;
  const version = settings.data.active_standards_version;
  const rows = await supabase
    .from('rank_thresholds')
    .select('tier, division, min_score')
    .eq('version', version);
  if (rows.error) throw rows.error;
  return {
    version,
    thresholds: sortThresholds(parseList(rows.data, parseThreshold)),
    maxScore: num(settings.data.max_score) ?? 1000,
    windowDays: settings.data.window_days,
    inactiveDays: settings.data.inactive_days,
  };
}

function parseLift(v: unknown): RankLift | null {
  if (!isObj(v)) return null;
  const rankKey = str(v.rank_key);
  const name = str(v.name);
  const discipline = oneOf(disciplines, v.discipline);
  if (!rankKey || !name || !discipline) return null;
  return { rankKey, name, discipline };
}

export async function fetchRankLifts(): Promise<RankLift[]> {
  const { data, error } = await getSupabase()
    .from('rank_lifts')
    .select('rank_key, name, discipline')
    .order('name');
  if (error) throw error;
  return parseList(data, parseLift);
}

/** Where a score sits: tier, division, progress through it and the next step. */
export function ladderPosition(score: number, ladder: RankLadder): TierPosition {
  return tierFor(score, ladder.thresholds, ladder.maxScore);
}

/** Score where the next division starts (null at the top). */
export function pointsToNext(score: number, ladder: RankLadder): number | null {
  const { nextScore } = ladderPosition(score, ladder);
  return nextScore === null ? null : Math.max(0, Math.ceil((nextScore - score) * 10) / 10);
}
