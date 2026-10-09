import { memo } from 'react';
import { View } from 'react-native';

import { Icon, PressableScale, Text } from '@/components';
import type { Exercise } from '@/lib/exercises';
import type { WeightUnit } from '@/lib/units';
import { formatVolume, type WorkoutListItem } from '@/lib/workouts';

import { formatMinutes, formatWorkoutDate } from './format';

interface HistoryRowProps {
  workout: WorkoutListItem;
  library: ReadonlyMap<string, Exercise>;
  unit: WeightUnit;
  onPress: (id: string) => void;
}

/** One finished workout: name, when, how long, volume and sets, and what it included. */
export const HistoryRow = memo(function HistoryRow({
  workout,
  library,
  unit,
  onPress,
}: HistoryRowProps) {
  const names = workout.exerciseIds
    .slice(0, 3)
    .map((id) => library.get(id)?.name)
    .filter(Boolean)
    .join(', ');
  const more = workout.exerciseIds.length > 3 ? ` +${workout.exerciseIds.length - 3}` : '';
  const stats = [
    formatMinutes(workout.durationSec),
    workout.totalVolumeKg > 0 ? formatVolume(workout.totalVolumeKg, unit) : null,
    `${workout.setCount} sets`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${workout.name}, ${formatWorkoutDate(workout.startedAt)}, ${stats}`}
      onPress={() => onPress(workout.id)}
      className="mb-sm flex-row items-center gap-md rounded-lg border-t border-edge bg-surface p-lg"
    >
      <View className="flex-1 gap-xxs">
        <Text variant="overline" tone="muted">
          {formatWorkoutDate(workout.startedAt)}
        </Text>
        <Text variant="subheading" numberOfLines={1}>
          {workout.name}
        </Text>
        <Text variant="caption" tone="muted" numeric>
          {stats}
        </Text>
        {names ? (
          <Text variant="caption" numberOfLines={1}>
            {names}
            {more}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} tone="textMuted" />
    </PressableScale>
  );
});
