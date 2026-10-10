import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BodyMap, Card, Chip, Text } from '@/components';
import {
  muscleLabels,
  muscleRoles,
  roleLabels,
  type Exercise,
  type Muscle,
  type MuscleRole,
} from '@/lib/exercises';
import { useTheme } from '@/theme';

/** Muscles worked: the body map (primary movers in the signal colour) and the list by role. */
export function MusclesCard({ exercise }: { exercise: Exercise }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const values = useMemo(() => {
    const out: Partial<Record<Muscle, MuscleRole>> = {};
    for (const m of exercise.muscles) out[m.muscle] = m.role;
    return out;
  }, [exercise.muscles]);
  const primaries = exercise.muscles
    .filter((m) => m.role === 'primary')
    .map((m) => muscleLabels[m.muscle]);

  return (
    <Card className="gap-lg" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <BodyMap<MuscleRole>
          values={values}
          colourScale={(role) => (role === 'primary' ? colors.primary : colors.textMuted)}
          width={Math.min(320, width - 32)}
          accessibilityLabel={`Body map. Primary: ${primaries.join(', ') || 'none'}`}
        />
      ) : null}
      {muscleRoles.map((role) => {
        const list = exercise.muscles.filter((m) => m.role === role);
        if (list.length === 0) return null;
        return (
          <View key={role} className="gap-sm">
            <Text variant="overline" tone="muted">
              {roleLabels[role]}
            </Text>
            <View className="flex-row flex-wrap gap-sm">
              {list.map((m) => (
                <Chip
                  key={m.muscle}
                  label={muscleLabels[m.muscle]}
                  selected={role === 'primary'}
                  accessibilityLabel={`${muscleLabels[m.muscle]}, ${roleLabels[role].toLowerCase()}`}
                />
              ))}
            </View>
          </View>
        );
      })}
    </Card>
  );
}
