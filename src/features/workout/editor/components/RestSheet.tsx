import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, NumberStepper, Sheet, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { formatRest, restPresets, ROUTINE_LIMITS, supersetPositions } from '@/lib/routines';

import { setRoundRest, updateExercise } from '../actions';
import { editRoutine, useRoutineEditor } from '../store';

/** One rest picker: preset chips plus a custom stepper in 15 s steps. */
function RestPicker({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value: number;
  onChange: (sec: number) => void;
  allowNone?: boolean;
}) {
  const presets = allowNone ? [0, ...restPresets] : [...restPresets];
  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-sm">
        {presets.map((sec) => (
          <Chip
            key={sec}
            label={sec === 0 ? 'None' : sec < 120 ? `${sec}s` : `${sec / 60}m`}
            selected={value === sec}
            onPress={() => {
              haptics.selection();
              onChange(sec);
            }}
          />
        ))}
      </View>
      <NumberStepper
        label="Custom"
        value={value}
        onChange={onChange}
        min={0}
        max={ROUTINE_LIMITS.restMaxSec}
        step={15}
        format={formatRest}
      />
    </View>
  );
}

/** Rest after each set; superset members also set the rest after a full round. */
export function RestSheet() {
  const sheet = useRoutineEditor((s) => s.sheet);
  const doc = useRoutineEditor((s) => s.doc);
  const close = () => useRoutineEditor.getState().openSheet(null);
  const exerciseId = sheet?.kind === 'rest' ? sheet.exerciseId : null;
  const index = doc?.exercises.findIndex((e) => e.id === exerciseId) ?? -1;
  const exercise = index >= 0 ? doc!.exercises[index]! : null;
  const position = exercise ? supersetPositions(doc!.exercises)[index] : null;

  const [rest, setRest] = useState(0);
  const [round, setRound] = useState(0);
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (exercise && openFor !== exercise.id) {
    setOpenFor(exercise.id);
    setRest(exercise.restSeconds);
    setRound(exercise.restAfterSupersetSeconds ?? exercise.restSeconds);
  }
  if (!exercise && openFor !== null) setOpenFor(null);

  const apply = () => {
    if (!exercise) return;
    editRoutine((d) => {
      const next = updateExercise(d, exercise.id, { restSeconds: rest });
      return position ? setRoundRest(next, exercise.id, round) : next;
    });
    close();
  };

  return (
    <Sheet visible={!!exercise} onClose={close} title="Rest timer">
      <View className="gap-lg pb-sm">
        <RestPicker
          label={position ? 'Before the next exercise in the superset' : 'After each set'}
          value={rest}
          onChange={setRest}
          allowNone={!!position}
        />
        {position ? (
          <RestPicker label="After each round" value={round} onChange={setRound} />
        ) : null}
        <Button label="Done" onPress={apply} fullWidth />
      </View>
    </Sheet>
  );
}
