import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { EmptyState, ListGroup, ListItem, Screen, Skeleton } from '@/components';
import {
  scheduleLeagueResults,
  useLeagueHome,
  useLeagueResultsPref,
  useLeagueStandings,
  useMarkResultSeen,
} from '@/lib/leagues';
import { useServerReads } from '@/lib/ranks';

import { ChallengesCard } from '../components/leagues/ChallengesCard';
import { CustomLeaguesCard } from '../components/leagues/CustomLeaguesCard';
import { LeagueChatCard } from '../components/leagues/LeagueChatCard';
import { LeagueHeroCard } from '../components/leagues/LeagueHeroCard';
import { LeagueResultSheet } from '../components/leagues/LeagueResultSheet';
import { LpBreakdownCard } from '../components/leagues/LpBreakdownCard';
import { StandingsList } from '../components/leagues/StandingsList';
import { SignedOutRanks } from '../components/SignedOutRanks';

/** Rank → Leagues: this week's group and standings, my LP, challenges, friend leagues and history. */
export function LeaguesScreen() {
  const signedIn = useServerReads();
  const home = useLeagueHome();
  const standings = useLeagueStandings(home.data?.league?.id);
  const pref = useLeagueResultsPref();
  const seen = useMarkResultSeen();
  const weekEnd = home.data?.week?.endsAt;

  useEffect(() => {
    if (weekEnd && pref.data !== undefined) void scheduleLeagueResults(weekEnd, pref.data);
  }, [weekEnd, pref.data]);

  if (!signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutRanks what="leagues" />
      </Screen>
    );
  }

  const data = home.data;
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        {home.isLoading ? <Skeleton height={200} radius="lg" /> : null}
        {home.isError ? (
          <EmptyState
            title="Leagues could not load"
            description="Check your connection and try again."
            action={{ label: 'Try again', onPress: () => void home.refetch() }}
          />
        ) : null}
        {data ? <LeagueHeroCard home={data} /> : null}
        {data && !data.league ? (
          <EmptyState
            icon="trophy-outline"
            title="Finish a workout to join this week’s league"
            description="You’ll be placed in a group of about 30 lifters at your level. Effort wins, not strength."
            action={{ label: 'Start a workout', onPress: () => router.push('/workout') }}
          />
        ) : null}
        {standings.data ? <StandingsList standings={standings.data} /> : null}
        {data?.league && standings.isLoading ? <Skeleton height={320} radius="lg" /> : null}
        {data?.breakdown && data.league ? <LpBreakdownCard breakdown={data.breakdown} /> : null}
        {data?.league ? <ChallengesCard leagueId={data.league.id} /> : null}
        {data?.league ? <LeagueChatCard /> : null}
        {data ? <CustomLeaguesCard leagues={data.custom} /> : null}
        <ListGroup>
          <ListItem
            title="League history"
            subtitle="Past weeks and seasons"
            onPress={() => router.push('/leagues/history')}
          />
          {data?.season ? (
            <ListItem
              title={`Season ${data.season.number} so far`}
              subtitle="Your season recap"
              onPress={() =>
                router.push({
                  pathname: '/leagues/season/[id]',
                  params: { id: String(data.season?.id) },
                })
              }
            />
          ) : null}
        </ListGroup>
      </View>
      <LeagueResultSheet
        result={data?.result ?? null}
        onDone={() => data?.result && seen.mutate(data.result.leagueId)}
      />
    </Screen>
  );
}
