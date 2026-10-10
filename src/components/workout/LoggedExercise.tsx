import { View } from 'react-native';

import { Text } from '../Text';
import { setMarks } from '@/lib/routines';
import { fromKg, type WeightUnit } from '@/lib/units';
import { formatPrevious, setE1rm, type WorkoutExercise } from '@/lib/workouts';

/** A finished exercise in the detail view: each set as "100 × 5", with e1RM and missed sets. */
export function LoggedExercise({
  exercise,
  name,
  unit,
}: {
  exercise: WorkoutExercise;
  name: string;
  unit: WeightUnit;
}) {
  const marks = setMarks(exercise.sets);
  return (
    <View className="gap-sm rounded-lg border-t border-edge bg-surface p-lg">
      <Text variant="subheading">{name}</Text>
      {exercise.notes ? (
        <Text variant="caption" tone="muted">
          {exercise.notes}
        </Text>
      ) : null}
      {exercise.sets.map((s, i) => {
        const e1rm = setE1rm(s);
        return (
          <View key={s.id} className="flex-row items-center gap-md">
            <Text variant="label" tone="muted" numeric className="w-6 text-center">
              {marks[i]}
            </Text>
            <Text variant="body" numeric className="flex-1">
              {formatPrevious(s, unit) || '–'}
              {s.failed ? '  · missed' : ''}
            </Text>
            {e1rm !== null ? (
              <Text variant="caption" tone="muted" numeric>
                e1RM {fromKg(e1rm, unit, 0.5)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
