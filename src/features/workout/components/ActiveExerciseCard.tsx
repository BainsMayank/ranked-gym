import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, RankTag, Text } from '@/components';
import { rankColors } from '@/theme';

import { session, type RoutineExercise } from '../mocks';
import { SetLogRow } from './SetLogRow';
import { workingNumbers } from './SetTypeBadge';

/** The exercise being logged: its rank, the next rank-up target, and the set log. */
export function ActiveExerciseCard({ exercise }: { exercise: RoutineExercise }) {
  const [done, setDone] = useState<boolean[]>(exercise.sets.map((s) => !!s.done));
  const numbers = workingNumbers(exercise.sets);

  return (
    <Card className="gap-md">
      <View className="flex-row items-start justify-between gap-md">
        <View className="flex-1">
          <Text variant="heading">{exercise.name}</Text>
          <Text variant="caption" tone="muted">
            Rest {exercise.rest} · range 6–8 · {exercise.effort}
          </Text>
        </View>
        <RankTag tier={session.exerciseRank.tier} division={session.exerciseRank.division} />
      </View>
      <Text variant="label" style={{ color: rankColors[session.rankHint.tier].base }}>
        {session.rankHint.text}
      </Text>
      <View className="gap-xs">
        <View className="flex-row gap-xs px-xs">
          <Text variant="overline" tone="muted" className="w-9">
            Set
          </Text>
          <Text variant="overline" tone="muted" className="w-16">
            Last
          </Text>
          <Text variant="overline" tone="muted" className="flex-1 text-center">
            kg
          </Text>
          <Text variant="overline" tone="muted" className="flex-1 text-center">
            Reps
          </Text>
          <Text variant="overline" tone="muted" className="w-10 text-center">
            {exercise.effort}
          </Text>
          <View className="w-11" />
        </View>
        {exercise.sets.map((s, i) => {
          return (
            <SetLogRow
              key={i}
              set={s}
              index={i}
              workingNumber={numbers[i]}
              done={done[i] ?? false}
              onToggle={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
            />
          );
        })}
      </View>
      <View className="flex-row gap-sm">
        <Button
          label="Add set"
          icon="add"
          variant="secondary"
          size="sm"
          className="flex-1"
          onPress={() => undefined}
        />
        <Button
          label="Plate calculator"
          variant="secondary"
          size="sm"
          className="flex-1"
          onPress={() => undefined}
        />
      </View>
    </Card>
  );
}
