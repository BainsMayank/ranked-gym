import { Fragment } from 'react';
import { View } from 'react-native';

import { Text } from '@/components';

import type { RoutineExercise } from '../mocks';
import { ExerciseEditorCard } from './ExerciseEditorCard';

/** Exercises run back to back as a superset, framed together with a shared header. */
export function SupersetGroup({
  label,
  exercises,
}: {
  label: string;
  exercises: RoutineExercise[];
}) {
  const last = exercises[exercises.length - 1];
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-surface">
      <View className="flex-row items-center justify-between bg-surface-raised px-lg py-sm">
        <Text variant="overline" tone="primary">
          Superset {label}
        </Text>
        <Text variant="caption" tone="muted">
          rest {last?.rest} after round
        </Text>
      </View>
      {exercises.map((e, i) => (
        <Fragment key={e.id}>
          {i > 0 ? <View className="mx-lg h-px bg-border" /> : null}
          <View className="p-lg">
            <ExerciseEditorCard exercise={e} nested />
          </View>
        </Fragment>
      ))}
    </View>
  );
}
