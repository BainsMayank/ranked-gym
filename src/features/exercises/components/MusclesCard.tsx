import { View } from 'react-native';

import { Card, Chip, Icon, Text } from '@/components';
import { muscleLabels, muscleRoles, roleLabels, type Exercise } from '@/lib/exercises';

/** Muscles worked, grouped by role, beside a slot for the body map (drawn in Phase 7). */
export function MusclesCard({ exercise }: { exercise: Exercise }) {
  return (
    <Card className="gap-lg">
      <View
        accessibilityLabel="Body map coming soon"
        className="h-28 items-center justify-center gap-xs rounded-md bg-surface-raised"
      >
        <Icon name="body-outline" size={36} tone="textMuted" />
        <Text variant="caption" tone="muted">
          Body map lands with the Rank tab
        </Text>
      </View>
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
