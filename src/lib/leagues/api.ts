import { parseList } from '@/lib/ranks/json';
import { getSupabase } from '@/lib/supabase';

import {
  parseChallenge,
  parseHistoryItem,
  parseLeagueHome,
  parseSeasonRecap,
  parseStandings,
} from './parse';
import type {
  ChallengeKind,
  LeagueChallenge,
  LeagueHistoryItem,
  LeagueHome,
  LeagueScoring,
  LeagueStandings,
  SeasonRecap,
} from './types';

export async function fetchLeagueHome(): Promise<LeagueHome | null> {
  const { data, error } = await getSupabase().rpc('get_league_home');
  if (error) throw error;
  return parseLeagueHome(data);
}

export async function fetchStandings(leagueId: string): Promise<LeagueStandings | null> {
  const { data, error } = await getSupabase().rpc('get_league_standings', { p_league: leagueId });
  if (error) throw error;
  return parseStandings(data);
}

export async function fetchChallenges(leagueId: string): Promise<LeagueChallenge[]> {
  const { data, error } = await getSupabase().rpc('get_league_challenges', { p_league: leagueId });
  if (error) throw error;
  return parseList(data, parseChallenge);
}

export async function fetchLeagueHistory(): Promise<LeagueHistoryItem[]> {
  const { data, error } = await getSupabase().rpc('get_league_history');
  if (error) throw error;
  return parseList(data, parseHistoryItem);
}

export async function fetchSeasonRecap(seasonId: number): Promise<SeasonRecap | null> {
  const { data, error } = await getSupabase().rpc('get_season_recap', { p_season: seasonId });
  if (error) throw error;
  return parseSeasonRecap(data);
}

export interface NewCustomLeague {
  name: string;
  weeks: number;
  scoring: LeagueScoring;
  rankKey?: string | null;
}

export async function createCustomLeague(
  input: NewCustomLeague,
): Promise<{ id: string; inviteCode: string }> {
  const { data, error } = await getSupabase().rpc('create_custom_league', {
    p_name: input.name,
    p_weeks: input.weeks,
    p_scoring: input.scoring,
    p_rank_key: input.scoring === 'lift_improvement' ? (input.rankKey ?? undefined) : undefined,
  });
  if (error) throw error;
  const row = data as { id?: unknown; invite_code?: unknown } | null;
  if (typeof row?.id !== 'string' || typeof row.invite_code !== 'string') {
    throw new Error('The league was not created');
  }
  return { id: row.id, inviteCode: row.invite_code };
}

export async function joinLeague(code: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('join_league', { p_code: code });
  if (error) throw error;
  return data;
}

export async function leaveLeague(leagueId: string): Promise<void> {
  const { error } = await getSupabase().rpc('leave_league', { p_league: leagueId });
  if (error) throw error;
}

export interface NewChallenge {
  leagueId: string;
  kind: ChallengeKind;
  title: string;
  rankKey?: string | null;
  target?: number | null;
}

export async function createChallenge(input: NewChallenge): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_league_challenge', {
    p_league: input.leagueId,
    p_kind: input.kind,
    p_title: input.title,
    p_rank_key: input.rankKey ?? undefined,
    p_target: input.target ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function markResultSeen(leagueId: string): Promise<void> {
  const { error } = await getSupabase().rpc('mark_league_result_seen', { p_league: leagueId });
  if (error) throw error;
}

/** Friendly copy for the errors the league functions raise. */
export function leagueErrorMessage(error: unknown): string {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';
  if (/No league with that code/i.test(message))
    return 'No league has that code. Check it and try again.';
  if (/finished/i.test(message)) return 'That league has finished.';
  if (/full/i.test(message)) return 'That league is full.';
  if (/5 leagues/i.test(message)) return 'You can run 5 leagues at a time.';
  if (/creator/i.test(message)) return 'Only the league’s creator can add challenges.';
  return 'Something went wrong. Check your connection and try again.';
}
