import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button, Card, Screen, Skeleton, Text } from '@/components';
import { recordLine, recoveryNow, useAnalytics, useClock, useGoals } from '@/lib/insights';
import { useUserId } from '@/lib/auth';
import { useSyncStatusStore } from '@/lib/sync/status';

import { EntryGrid } from '../insights/EntryGrid';
import { GoalCelebration } from '../insights/GoalCelebration';
import { DataNotice } from '../insights/InsightFrame';
import { TodayCard } from '../insights/TodayCard';
import { WeeklySummary, weeklyTotals } from '../insights/WeeklySummary';

/** Home → For You: today's session, then muscle volume, recovery, goals and the 14-day overview. */
export function ForYouScreen() {
  const userId = useUserId();
  const online = useSyncStatusStore((s) => s.online);
  const query = useAnalytics(14);
  const goals = useGoals();
  const now = useClock();
  const router = useRouter();
  const data = query.data;
  const rows = data ? recoveryNow(data.fatigue, Date.parse(data.asOf), now, data.speed) : [];
  return (
    <Screen
      edges={[]}
      scroll
      className="pt-sm"
      onRefresh={() => {
        void query.refetch();
        void goals.refetch();
      }}
      refreshing={query.isFetching && !query.isPending}
    >
      <View className="gap-lg">
        <DataNotice query={query} />
        {!data ? (
          !userId ? (
            <View className="gap-md">
              <Text variant="heading">Your training insights</Text>
              <Text tone="muted">
                Sign in to load your personal numbers. Workouts saved on this phone stay in History.
              </Text>
              <Button label="Generate workout" onPress={() => router.push('/workout/generate')} />
            </View>
          ) : query.isError || !online ? (
            <View className="gap-md">
              <Text variant="heading">Your training dashboard is waiting</Text>
              <Text tone="muted">Connect to load your logged workouts.</Text>
              <Button label="Try again" onPress={() => void query.refetch()} />
            </View>
          ) : (
            <>
              <Skeleton height={160} />
              <Skeleton height={160} />
              <Skeleton height={80} />
            </>
          )
        ) : (
          <>
            <TodayCard data={data} now={now} />
            <EntryGrid
              data={data}
              goals={goals.data ?? []}
              recovery={rows.reduce((s, r) => s + r.percent, 0) / Math.max(1, rows.length)}
              weekVolume={weeklyTotals(data, now).current.volume}
            />
            {goals.isError ? (
              <Text variant="caption" tone="muted">
                Goals could not refresh. Open Goals to retry.
              </Text>
            ) : null}
            <Text variant="heading">Recent milestones</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-md"
            >
              {data.records.slice(0, 4).map((r) => (
                <Card key={r.id} className="max-w-64 gap-xs">
                  <Text variant="label" tone="success">
                    New PR
                  </Text>
                  <Text variant="subheading" numberOfLines={2}>
                    {r.name}
                  </Text>
                  <Text numeric>{recordLine(r)}</Text>
                  <Button
                    label="View workout"
                    variant="outline"
                    size="sm"
                    onPress={() =>
                      router.push({ pathname: '/workouts/[id]', params: { id: r.workout_id } })
                    }
                  />
                </Card>
              ))}
              {data.rankups.slice(0, 3).map((r) => (
                <Card key={r.id} className="max-w-64 gap-xs">
                  <Text variant="label" tone="success">
                    Rank up
                  </Text>
                  <Text variant="subheading">{r.name.replaceAll('_', ' ')}</Text>
                  <Text>
                    {r.tier}{' '}
                    {r.division === 3
                      ? 'III'
                      : r.division === 2
                        ? 'II'
                        : r.division === 1
                          ? 'I'
                          : ''}
                  </Text>
                  {r.workout_id ? (
                    <Button
                      label="View workout"
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        router.push({ pathname: '/workouts/[id]', params: { id: r.workout_id! } })
                      }
                    />
                  ) : null}
                </Card>
              ))}
            </ScrollView>
            {!data.records.length && !data.rankups.length ? (
              <Text tone="muted">
                New records and rank-ups will appear here. Your first results set a baseline.
              </Text>
            ) : null}
            <WeeklySummary data={data} now={now} />
            <GoalCelebration goals={goals.data ?? []} />
          </>
        )}
      </View>
    </Screen>
  );
}
