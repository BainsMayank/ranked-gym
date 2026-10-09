import { View } from 'react-native';

import { Stat, Text } from '@/components';
import type { WeightUnit } from '@/lib/units';
import { formatVolume, type WorkoutSummary } from '@/lib/workouts';

import { formatElapsed } from '../session/components/ElapsedClock';

interface WorkoutStatsProps {
  summary: WorkoutSummary;
  unit: WeightUnit;
  /** Finish screen only: suggest a weigh-in when there's no calorie estimate. */
  showBodyweightHint?: boolean;
}

/** Duration, volume, sets and exercises, then the calorie estimate (always labelled one). */
export function WorkoutStats({ summary, unit, showBodyweightHint = false }: WorkoutStatsProps) {
  return (
    <View className="gap-md">
      <View className="flex-row gap-lg">
        <Stat label="Duration" value={formatElapsed(summary.durationSec)} size="lg" />
        <Stat label="Volume" value={formatVolume(summary.volumeKg, unit)} size="lg" />
      </View>
      <View className="flex-row gap-lg">
        <Stat label="Sets" value={String(summary.sets)} />
        <Stat label="Exercises" value={String(summary.exercises)} />
        <Stat
          label="Calories (estimate)"
          value={summary.calories === null ? '–' : `≈ ${summary.calories} kcal`}
        />
      </View>
      {summary.calories === null && showBodyweightHint ? (
        <Text variant="caption" tone="muted">
          Log your bodyweight in your profile to see a calorie estimate.
        </Text>
      ) : null}
    </View>
  );
}
