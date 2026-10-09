import { View } from 'react-native';

import { Button, Text } from '@/components';
import type { PlanDay } from '@/lib/plans';
import { useRoutineDoc } from '@/lib/routines';

import { useStartWorkout } from '../../session/hooks/useStartWorkout';
import { formatPlanDate } from '../format';

interface TodaySessionProps {
  today: PlanDay | null;
  next: PlanDay | null;
  paused: boolean;
  onResume: () => void;
}

/** Today's planned session with Start, or when the next one is. */
export function TodaySession({ today, next, paused, onResume }: TodaySessionProps) {
  const start = useStartWorkout();
  const { data: routine } = useRoutineDoc(today?.routineId ?? undefined);

  if (paused) {
    return (
      <View className="flex-row items-center gap-md">
        <View className="flex-1 gap-xxs">
          <Text variant="subheading">Plan paused</Text>
          <Text variant="caption" tone="muted">
            Resume and your sessions pick up from today.
          </Text>
        </View>
        <Button label="Resume" onPress={onResume} />
      </View>
    );
  }
  if (today) {
    return (
      <View className="flex-row items-center gap-md">
        <View className="flex-1 gap-xxs">
          <Text variant="overline" tone="muted">
            Today
          </Text>
          <Text variant="heading">{today.label}</Text>
          {routine ? (
            <Text variant="caption" tone="muted">
              {routine.exercises.length} exercises · ~{routine.estimatedDurationMin} min
            </Text>
          ) : null}
        </View>
        <Button
          label="Start"
          icon="play"
          accessibilityLabel={`Start ${today.label}`}
          onPress={() => start({ kind: 'planDay', planDayId: today.id })}
        />
      </View>
    );
  }
  return (
    <View className="gap-xxs">
      <Text variant="overline" tone="muted">
        Today
      </Text>
      <Text variant="heading">Rest day</Text>
      <Text variant="caption" tone="muted">
        {next ? `Next: ${next.label}, ${formatPlanDate(next.date)}` : 'No more sessions planned.'}
      </Text>
    </View>
  );
}
