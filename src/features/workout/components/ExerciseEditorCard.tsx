import { useState } from 'react';
import { View } from 'react-native';

import { Button, IconButton, SegmentedControl, Tag, Text } from '@/components';
import { cn } from '@/lib/utils';

import type { RoutineExercise } from '../mocks';
import { SetCell } from './SetCell';
import { SetTypeBadge, workingNumbers } from './SetTypeBadge';

const MODES = [
  { value: 'reps', label: 'Reps' },
  { value: 'range', label: 'Range' },
  { value: 'time', label: 'Time' },
] as const;

/** Routine builder: one exercise with its target mode, rest, note and planned sets. */
export function ExerciseEditorCard({
  exercise,
  nested = false,
}: {
  exercise: RoutineExercise;
  nested?: boolean;
}) {
  const [mode, setMode] = useState(exercise.mode);
  const numbers = workingNumbers(exercise.sets);

  return (
    <View className={cn('gap-md', !nested && 'rounded-lg border-t border-edge bg-surface p-lg')}>
      <View className="flex-row items-start gap-md">
        <View className="flex-1">
          <Text variant="subheading">{exercise.name}</Text>
          <Text variant="caption" tone="muted">
            {exercise.muscles}
          </Text>
        </View>
        <IconButton
          icon="ellipsis-horizontal"
          accessibilityLabel={`${exercise.name} options`}
          size="sm"
        />
      </View>
      <View className="flex-row items-center gap-sm">
        <SegmentedControl
          accessibilityLabel="Target type"
          options={MODES}
          value={mode}
          onChange={setMode}
          className="w-48"
        />
        <Tag label={`Rest ${exercise.rest}`} icon="timer-outline" />
      </View>
      {exercise.note ? (
        <Text variant="caption" tone="muted" className="rounded-sm bg-surface-raised px-md py-sm">
          {exercise.note}
        </Text>
      ) : null}
      <View className="gap-sm">
        <View className="flex-row gap-sm">
          <Text variant="overline" tone="muted" className="w-9">
            Set
          </Text>
          <Text variant="overline" tone="muted" className="flex-1">
            {exercise.loadLabel ?? 'kg'}
          </Text>
          <Text variant="overline" tone="muted" className="flex-1">
            {exercise.repsLabel ?? 'Reps'}
          </Text>
          <Text variant="overline" tone="muted" className="w-12 text-center">
            {exercise.effort}
          </Text>
        </View>
        {exercise.sets.map((s, i) => {
          const n = i + 1;
          return (
            <View key={i} className="flex-row items-center gap-sm">
              <SetTypeBadge type={s.type} number={numbers[i]} />
              <SetCell value={s.kg} accessibilityLabel={`Set ${n} weight`} className="flex-1" />
              <SetCell value={s.reps} accessibilityLabel={`Set ${n} reps`} className="flex-1" />
              <SetCell
                value={s.effort}
                accessibilityLabel={`Set ${n} ${exercise.effort}`}
                className="w-12 text-center"
              />
            </View>
          );
        })}
      </View>
      <Button
        label="Add set"
        icon="add"
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => undefined}
      />
    </View>
  );
}
