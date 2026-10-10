import { View } from 'react-native';

import { Card, ProgressBar, Skeleton, Text } from '@/components';
import { useLeagueChallenges, type LeagueChallenge } from '@/lib/leagues';

function ChallengeRow({ c }: { c: LeagueChallenge }) {
  const leader = c.leaders[0];
  return (
    <View className="gap-xs border-b border-border pb-sm">
      <View className="flex-row items-center justify-between gap-sm">
        <Text variant="label" className="flex-1">
          {c.title}
        </Text>
        <Text variant="label" numeric>
          {c.target ? `${Math.min(c.mine, c.target)}/${c.target}` : c.mine}
        </Text>
      </View>
      {c.target ? (
        <ProgressBar
          progress={c.mine / c.target}
          tone={c.mine >= c.target ? 'success' : 'neutral'}
          height={4}
          accessibilityLabel={`${c.title}: ${c.mine} of ${c.target}`}
        />
      ) : null}
      <Text variant="caption" tone="muted" numeric>
        {c.target
          ? `${c.completedBy} done so far`
          : leader
            ? `Leader: ${leader.isYou ? 'you' : leader.displayName} with ${leader.value}`
            : 'Nobody has started yet'}
      </Text>
    </View>
  );
}

/** This league's challenges, with your progress and who leads. */
export function ChallengesCard({ leagueId }: { leagueId: string }) {
  const challenges = useLeagueChallenges(leagueId);
  if (challenges.isLoading) return <Skeleton height={120} radius="lg" />;
  if (!challenges.data?.length) return null;
  return (
    <Card className="gap-md">
      <Text variant="subheading">Challenges</Text>
      {challenges.data.map((c) => (
        <ChallengeRow key={c.id} c={c} />
      ))}
    </Card>
  );
}
