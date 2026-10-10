import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  LeagueBadge,
  ListGroup,
  ListItem,
  Screen,
  Skeleton,
  Stat,
  Text,
} from '@/components';
import { useSeasonRecap } from '@/lib/leagues';
import { useProfile } from '@/lib/profile';

import { divisionName } from '../components/leagues/leagueCopy';

/** One season in review: weeks played, LP, finishes, promotions, training and the reward. */
export function SeasonRecapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recap = useSeasonRecap(Number(id) || undefined);
  const profile = useProfile().data;
  const r = recap.data;

  return (
    <Screen title={r ? `Season ${r.season.number}` : 'Season'} onBack={() => router.back()} scroll>
      {recap.isLoading ? <Skeleton height={320} radius="lg" /> : null}
      {!recap.isLoading && !r ? <EmptyState title="Season not found" /> : null}
      {r ? (
        <View className="gap-lg">
          <View className="items-center gap-sm rounded-lg border-t border-edge bg-surface p-lg">
            {r.bestDivision ? <LeagueBadge division={r.bestDivision} size={96} /> : null}
            <Text variant="title">
              {r.bestDivision ? `Best: ${divisionName(r.bestDivision)}` : 'No weeks played'}
            </Text>
            <Text tone="muted">
              {r.season.status === 'closed' ? 'Season finished' : 'Season in progress'}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-sm">
            <Stat
              label="Weeks played"
              value={`${r.weeksPlayed}/8`}
              boxed
              center
              className="min-w-[30%] flex-1"
            />
            <Stat
              label="League Points"
              value={r.totalPoints.toLocaleString('en-IN')}
              boxed
              center
              className="min-w-[30%] flex-1"
            />
            <Stat
              label="Best finish"
              value={r.bestFinish ? `#${r.bestFinish}` : '—'}
              boxed
              center
              className="min-w-[30%] flex-1"
            />
            <Stat
              label="Promotions"
              value={String(r.promotions)}
              valueTone="success"
              boxed
              center
              className="min-w-[30%] flex-1"
            />
            <Stat
              label="Workouts"
              value={String(r.workouts)}
              boxed
              center
              className="min-w-[30%] flex-1"
            />
            <Stat
              label="PRs · rank-ups"
              value={`${r.prs} · ${r.rankUps}`}
              boxed
              center
              className="min-w-[30%] flex-1"
            />
          </View>
          {r.reward ? (
            <Card className="flex-row items-center gap-md">
              <Avatar
                name={profile?.display_name ?? 'You'}
                uri={profile?.avatar_url ?? undefined}
                size="lg"
                frameId={r.reward.frameKey ?? undefined}
              />
              <View className="flex-1 gap-xxs">
                <Text variant="subheading">Season {r.season.number} reward</Text>
                <Text tone="muted">
                  {divisionName(r.reward.bestDivision)} badge
                  {r.reward.frameKey ? ' and avatar frame' : ''}
                </Text>
              </View>
            </Card>
          ) : r.season.status === 'open' ? (
            <Text tone="muted">
              Finish the season in Elite or Legend to earn an avatar frame; everyone who plays gets
              a badge.
            </Text>
          ) : null}
          {r.weeks.length ? (
            <ListGroup>
              {r.weeks.map((w) => (
                <ListItem
                  key={w.weekNo}
                  title={`Week ${w.weekNo} · ${divisionName(w.division)}`}
                  subtitle={`#${w.position ?? '—'} of ${w.members}${w.outcome && w.outcome !== 'stayed' ? ` · ${w.outcome}` : ''}`}
                  value={w.points !== null ? `${w.points} LP` : 'In play'}
                />
              ))}
            </ListGroup>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
