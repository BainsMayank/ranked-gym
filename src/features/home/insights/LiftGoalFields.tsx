import { Button, Input, Text } from '@/components';
import { useExercisePicker, useExercises } from '@/lib/exercises';
import { useRankPredictions } from '@/lib/ranks';
import type { GoalTarget } from '@/lib/insights';

export function LiftGoalFields({
  target,
  setTarget,
  number,
  setNumber,
  reps,
  setReps,
  setTitle,
  editing,
}: {
  target: GoalTarget;
  setTarget: (target: GoalTarget) => void;
  number: string;
  setNumber: (value: string) => void;
  reps: string;
  setReps: (value: string) => void;
  setTitle: (value: string) => void;
  editing: boolean;
}) {
  const pick = useExercisePicker();
  const { data: library } = useExercises();
  const { data: predictions } = useRankPredictions();
  const exercise = library?.find((e) => e.id === target.exercise_id);
  const suggestions = (predictions ?? []).filter((p) => p.loads.length && p.next).slice(0, 3);
  return (
    <>
      <Button
        label={exercise?.name ?? 'Choose exercise'}
        variant="outline"
        onPress={() =>
          void pick().then((picked) => {
            if (picked[0]) setTarget({ ...target, exercise_id: picked[0].id });
          })
        }
      />
      <Input
        label="Target load (kg)"
        helperText="For bodyweight lifts, enter added load."
        value={number}
        onChangeText={setNumber}
        keyboardType="decimal-pad"
      />
      <Input
        label="Reps at that load"
        value={reps}
        onChangeText={setReps}
        keyboardType="number-pad"
      />
      {!editing ? (
        <>
          <Text variant="subheading">Suggested next divisions</Text>
          {suggestions.map((p) => {
            const load = p.loads.find((l) => l.reps === 5) ?? p.loads[0];
            const ex = library?.find((e) => e.rankKey === p.rankKey);
            return load && ex ? (
              <Button
                key={p.rankKey}
                variant="secondary"
                size="sm"
                label={`${ex.name}: ${load.kg} kg × ${load.reps}`}
                onPress={() => {
                  setTarget({ ...target, exercise_id: ex.id });
                  setNumber(String(load.kg));
                  setReps(String(load.reps));
                  setTitle(`${ex.name} ${load.kg} kg × ${load.reps}`);
                }}
              />
            ) : null;
          })}
          {!suggestions.length ? (
            <Text variant="caption" tone="muted">
              Next-division suggestions appear after you have ranked lifts.
            </Text>
          ) : null}
        </>
      ) : null}
    </>
  );
}
