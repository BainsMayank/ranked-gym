import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { useExercises } from '@/lib/exercises';
import { currentWeek, isOpen, localDateKey, useActivePlan } from '@/lib/plans';
import { useRoutineDoc } from '@/lib/routines';

/** Today's planned session with the screen's one main action (it opens the session to start). */
export function TodayWorkoutCard() {
  const router = useRouter();
  const { data: plan } = useActivePlan();
  const { data: library } = useExercises();
  const today = localDateKey(new Date());
  const day = plan?.pausedAt ? undefined : plan?.days.find((d) => d.date === today && isOpen(d));
  const next = plan?.days.find((d) => d.date > today && isOpen(d));
  const { data: routine } = useRoutineDoc(day?.routineId ?? undefined);
  const names = useMemo(() => new Map((library ?? []).map((e) => [e.id, e.name])), [library]);

  if (!plan) {
    return (
      <Card className="gap-md">
        <Text variant="overline" tone="primary">
          Today
        </Text>
        <Text variant="heading">No plan yet</Text>
        <Text tone="muted">Get sessions built around your week, time and equipment.</Text>
        <Button label="Create a plan" onPress={() => router.push('/plan/new')} />
      </Card>
    );
  }

  const label = `Today · week ${Math.min(currentWeek(plan, today), plan.weeks.length)} of ${plan.name}`;
  if (!day) {
    return (
      <Card className="gap-md">
        <Text variant="overline" tone="primary" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="display">{plan.pausedAt ? 'Plan paused' : 'Rest day'}</Text>
        <Text tone="muted">{next ? `Next: ${next.label}` : 'Recover well.'}</Text>
        <Button label="See your plan" variant="secondary" onPress={() => router.push('/plan')} />
      </Card>
    );
  }

  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between gap-md">
        <Text variant="overline" tone="primary" className="flex-1" numberOfLines={1}>
          {label}
        </Text>
        {routine ? (
          <Text variant="label" tone="muted" numeric>
            ~{routine.estimatedDurationMin} min
          </Text>
        ) : null}
      </View>
      <View className="gap-xs">
        <Text variant="display">{day.label}</Text>
        {routine ? (
          <Text tone="muted" numberOfLines={2}>
            {routine.exercises
              .map((e) => names.get(e.exerciseId) ?? '')
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
      </View>
      <Button
        label="Start workout"
        icon="play"
        onPress={() => router.push({ pathname: '/plan/day/[id]', params: { id: day.id } })}
      />
    </Card>
  );
}
