import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/lib/queryClient';
import { useServerReads } from '@/lib/ranks/hooks';
import { getSupabase } from '@/lib/supabase';

import {
  createChallenge,
  createCustomLeague,
  fetchChallenges,
  fetchLeagueHistory,
  fetchLeagueHome,
  fetchSeasonRecap,
  fetchStandings,
  joinLeague,
  leaveLeague,
  markResultSeen,
  type NewChallenge,
  type NewCustomLeague,
} from './api';

export const leagueKeys = {
  all: ['leagues'] as const,
  home: ['leagues', 'home'] as const,
  standings: (id: string) => ['leagues', 'standings', id] as const,
  challenges: (id: string) => ['leagues', 'challenges', id] as const,
  history: ['leagues', 'history'] as const,
  recap: (seasonId: number) => ['leagues', 'recap', seasonId] as const,
};

const MINUTE = 60_000;
const invalidate = () => queryClient.invalidateQueries({ queryKey: leagueKeys.all });

/** Season, week, my group and LP breakdown, unseen result and custom leagues. */
export function useLeagueHome() {
  return useQuery({
    queryKey: leagueKeys.home,
    queryFn: fetchLeagueHome,
    enabled: useServerReads(),
    staleTime: MINUTE,
    refetchOnWindowFocus: true,
  });
}

export function useLeagueStandings(leagueId: string | undefined) {
  return useQuery({
    queryKey: leagueKeys.standings(leagueId ?? 'none'),
    queryFn: () => (leagueId ? fetchStandings(leagueId) : null),
    enabled: useServerReads() && !!leagueId,
    staleTime: MINUTE,
  });
}

export function useLeagueChallenges(leagueId: string | undefined) {
  return useQuery({
    queryKey: leagueKeys.challenges(leagueId ?? 'none'),
    queryFn: () => (leagueId ? fetchChallenges(leagueId) : []),
    enabled: useServerReads() && !!leagueId,
    staleTime: 5 * MINUTE,
  });
}

export function useLeagueHistory() {
  return useQuery({
    queryKey: leagueKeys.history,
    queryFn: fetchLeagueHistory,
    enabled: useServerReads(),
    staleTime: 10 * MINUTE,
  });
}

export function useSeasonRecap(seasonId: number | undefined) {
  return useQuery({
    queryKey: leagueKeys.recap(seasonId ?? 0),
    queryFn: () => (seasonId ? fetchSeasonRecap(seasonId) : null),
    enabled: useServerReads() && !!seasonId,
    staleTime: 10 * MINUTE,
  });
}

/** League writes need a connection (they're server-trusted), so they don't queue offline. */
const online = { networkMode: 'online' } as const;

export function useCreateCustomLeague() {
  return useMutation({
    ...online,
    mutationFn: (input: NewCustomLeague) => createCustomLeague(input),
    onSuccess: invalidate,
  });
}

export function useJoinLeague() {
  return useMutation({
    ...online,
    mutationFn: (code: string) => joinLeague(code),
    onSuccess: invalidate,
  });
}

export function useLeaveLeague() {
  return useMutation({
    ...online,
    mutationFn: (id: string) => leaveLeague(id),
    onSuccess: invalidate,
  });
}

export function useCreateChallenge() {
  return useMutation({
    ...online,
    mutationFn: (input: NewChallenge) => createChallenge(input),
    onSuccess: invalidate,
  });
}

export function useMarkResultSeen() {
  return useMutation({
    ...online,
    mutationFn: (id: string) => markResultSeen(id),
    onSuccess: invalidate,
  });
}

/** Whether the user wants league results reminders (Settings → Notifications; default on). */
export function useLeagueResultsPref() {
  return useQuery({
    queryKey: ['leagues', 'pref'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('user_settings')
        .select('notification_prefs')
        .single();
      if (error) throw error;
      const prefs = data.notification_prefs as { league_results?: unknown } | null;
      return prefs?.league_results !== false;
    },
    enabled: useServerReads(),
    staleTime: 30 * MINUTE,
  });
}
