import { View } from 'react-native';

import { EmptyState, IconButton, Text } from '@/components';
import { muscleShortLabels, musclesWithRole, type Exercise } from '@/lib/exercises';
import { formatRest } from '@/lib/routines';
import type { GeneratedWorkout } from '@/lib/workouts';

interface Props {
  workout: GeneratedWorkout;
  library: ReadonlyMap<string, Exercise>;
  onReroll: (index: number) => void;
  onRerollAll: () => void;
}

/** The generated session: one row per exercise with sets, reps and rest, each rerollable. */
export function GeneratedList({ workout, library, onReroll, onRerollAll }: Props) {
  if (workout.exercises.length === 0) {
    return (
      <EmptyState
        icon="barbell-outline"
        title="Nothing fits yet"
        description="Add some equipment or another focus and we'll build a session."
      />
    );
  }
  return (
    <View className="gap-md">
      <View className="flex-row items-center gap-sm">
        <View className="flex-1">
          <Text variant="heading">{workout.name}</Text>
          <Text variant="caption" tone="muted" numeric>
            About {workout.estimatedMin} min · {workout.exercises.length} exercises
          </Text>
        </View>
        <IconButton
          icon="shuffle"
          variant="surface"
          accessibilityLabel="Reroll the whole workout"
          onPress={onRerollAll}
        />
      </View>
      <View className="overflow-hidden rounded-lg border-t border-edge bg-surface">
        {workout.exercises.map((e, i) => {
          const info = library.get(e.exerciseId);
          const first = e.sets[0];
          const reps = first?.repsMin && first.repsMax ? `${first.repsMin}-${first.repsMax}` : '';
          return (
            <View
              key={e.id}
              className={`flex-row items-center gap-md px-lg py-md ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1 gap-xxs">
                <Text variant="subheading" numberOfLines={2}>
                  {info?.name ?? 'Exercise'}
                </Text>
                <Text variant="caption" tone="muted" numeric numberOfLines={1}>
                  {e.sets.length} × {reps} · rest {formatRest(e.restSeconds)}
                  {info
                    ? ` · ${musclesWithRole(info, 'primary')
                        .map((m) => muscleShortLabels[m])
                        .join(', ')}`
                    : ''}
                </Text>
              </View>
              <IconButton
                icon="refresh"
                size="sm"
                accessibilityLabel={`Swap ${info?.name ?? 'this exercise'} for another`}
                onPress={() => onReroll(i)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
