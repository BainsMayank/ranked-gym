import { View } from 'react-native';

import { Text } from '@/components';
import type { AttachedWorkout, PrMilestone } from '@/lib/social';
import type { WeightUnit } from '@/lib/units';
import { formatVolume } from '@/lib/workouts/summary';

import { formatSessionLength, prKindLabel, prValueText } from '../format';

/** A workout or record attached to a text or photo post: a quiet, inset summary. */
export function AttachedWorkoutCard({
  workout,
  unit,
}: {
  workout: AttachedWorkout;
  unit: WeightUnit;
}) {
  const totals = [
    formatSessionLength(workout.durationSec),
    workout.volumeKg > 0 ? formatVolume(workout.volumeKg, unit) : null,
    `${workout.exerciseCount} ${workout.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
  ].filter(Boolean);
  return (
    <View className="gap-xxs rounded-md border-t border-edge bg-surface-raised px-md py-sm">
      <Text variant="overline" tone="muted">
        Workout
      </Text>
      <Text variant="subheading" numberOfLines={1}>
        {workout.name}
      </Text>
      <Text variant="caption" tone="muted" numeric>
        {totals.join('  ·  ')}
      </Text>
    </View>
  );
}

export function AttachedPrCard({ pr, unit }: { pr: PrMilestone; unit: WeightUnit }) {
  return (
    <View className="gap-xxs rounded-md border-t border-edge bg-surface-raised px-md py-sm">
      <Text variant="overline" tone="success">
        PR · {prKindLabel(pr.kind)}
      </Text>
      <Text variant="subheading" numeric numberOfLines={1}>
        {pr.exerciseName} · {prValueText(pr, pr.value, unit)}
      </Text>
    </View>
  );
}
