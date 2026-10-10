import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, StreakChip, Text } from '@/components';
import { muscleLabels } from '@/lib/exercises/taxonomy';
import { recoveryNow, type Analytics } from '@/lib/insights';
import { isOpen, localDateKey, useActivePlan } from '@/lib/plans';
import { useProfile } from '@/lib/profile';
import { useActiveWorkout } from '@/lib/workouts';

import { LeagueStandingChip } from './LeagueStandingChip';

export function TodayCard({ data, now }: { data: Analytics; now: number }) {
  const router = useRouter();
  const { data: plan } = useActivePlan();
  const { data: profile } = useProfile();
  const { data: active } = useActiveWorkout();
  const today = localDateKey(new Date(now));
  const day =
    plan && !plan.pausedAt ? plan.days.find((d) => d.date === today && isOpen(d)) : undefined;
  const ready = recoveryNow(data.fatigue, Date.parse(data.asOf), now, data.speed).filter(
    (r) => r.ready,
  );
  const readyNames = ready
    .slice(0, 2)
    .map((r) => muscleLabels[r.muscle].toLowerCase())
    .join(' and ');
  const noLoad = !data.fatigue.length && !data.periods[0]?.sessions;
  const heading = active
    ? 'Your session is in progress'
    : day
      ? day.label
      : noLoad
        ? 'Plan your next session'
        : ready.length
          ? `Your ${readyNames} are recovered`
          : 'Take a little time to recover';
  return (
    <Card className="gap-md">
      <Text variant="caption" tone="muted">
        {profile?.display_name ? `Hello, ${profile.display_name.split(' ')[0]}` : 'Your day'} ·{' '}
        {new Date(now).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })}
      </Text>
      <Text variant="title">{heading}</Text>
      <Text tone="muted">
        {day
          ? 'Today’s planned session'
          : noLoad
            ? 'Log a session to build your recovery estimate.'
            : ready.length
              ? 'Based on your logged training. Choose a session that feels right.'
              : 'Recovery is an estimate. You can still build a light session.'}
      </Text>
      <View className="flex-row flex-wrap items-center gap-sm">
        <StreakChip days={data.streak} />
        <LeagueStandingChip />
      </View>
      <Button
        label={active ? 'Resume' : day ? 'Start' : 'Generate workout'}
        icon={active || day ? 'play' : 'shuffle-outline'}
        onPress={() =>
          active
            ? router.push('/session')
            : day
              ? router.push({ pathname: '/plan/day/[id]', params: { id: day.id } })
              : router.push('/workout/generate')
        }
      />
    </Card>
  );
}
