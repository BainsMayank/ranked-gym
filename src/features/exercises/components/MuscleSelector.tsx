import { View } from 'react-native';

import { Chip, Text } from '@/components';
import {
  muscleLabels,
  muscleRegions,
  MUSCLES_BY_REGION,
  regionLabels,
  type Muscle,
} from '@/lib/exercises';

export interface MuscleSelectorProps {
  label: string;
  selected: readonly Muscle[];
  /** Muscles taken by the other role: shown but not selectable. */
  unavailable?: readonly Muscle[];
  onChange: (next: Muscle[]) => void;
  error?: string;
}

/** Multi-select muscle chips grouped by body region. */
export function MuscleSelector({
  label,
  selected,
  unavailable = [],
  onChange,
  error,
}: MuscleSelectorProps) {
  const toggle = (muscle: Muscle) =>
    onChange(
      selected.includes(muscle) ? selected.filter((m) => m !== muscle) : [...selected, muscle],
    );

  return (
    <View className="gap-md">
      <Text variant="subheading">{label}</Text>
      {muscleRegions.map((region) => (
        <View key={region} className="gap-sm">
          <Text variant="overline" tone="muted">
            {regionLabels[region]}
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {MUSCLES_BY_REGION[region].map((muscle) => (
              <Chip
                key={muscle}
                label={muscleLabels[muscle]}
                selected={selected.includes(muscle)}
                disabled={unavailable.includes(muscle)}
                onPress={() => toggle(muscle)}
              />
            ))}
          </View>
        </View>
      ))}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
