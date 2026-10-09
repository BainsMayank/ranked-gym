import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, SegmentedControl, Sheet, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import {
  parseTempoInput,
  setTypeInfo,
  setTypes,
  topSetBefore,
  type RoutineSet,
  type SetType,
} from '@/lib/routines';

import { deleteSet, updateSet } from '../actions';
import { useEditorEnv } from '../EditorEnv';
import { editRoutine, useRoutineEditor } from '../store';

type LoadMode = 'kg' | 'percent_of_1rm' | 'percent_of_top_set';

function loadModeOf(set: RoutineSet): LoadMode {
  return set.weightMode === 'percent_of_1rm' || set.weightMode === 'percent_of_top_set'
    ? set.weightMode
    : 'kg';
}

/** Set options from its badge: type, how the load is given, tempo, delete. */
export function SetSheet() {
  const { exercises, unit } = useEditorEnv();
  const sheet = useRoutineEditor((s) => s.sheet);
  const doc = useRoutineEditor((s) => s.doc);
  const close = () => useRoutineEditor.getState().openSheet(null);

  const target = sheet?.kind === 'set' ? sheet : null;
  const exercise = doc?.exercises.find((e) => e.id === target?.exerciseId);
  const index = exercise?.sets.findIndex((s) => s.id === target?.setId) ?? -1;
  const set = index >= 0 ? exercise!.sets[index]! : null;
  const logType = exercise ? exercises.get(exercise.exerciseId)?.logType : undefined;

  const [tempo, setTempo] = useState('');
  const [tempoError, setTempoError] = useState<string>();
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (set && openFor !== set.id) {
    setOpenFor(set.id);
    setTempo(set.tempo ?? '');
    setTempoError(undefined);
  }

  if (!exercise || !set || !target) {
    return (
      <Sheet visible={false} onClose={close} title="Set">
        {null}
      </Sheet>
    );
  }
  const patch = (p: Partial<RoutineSet>) =>
    editRoutine((d) => updateSet(d, exercise.id, set.id, p));

  const loadOptions = [
    { value: 'kg' as const, label: unit },
    { value: 'percent_of_1rm' as const, label: '% 1RM' },
    ...(topSetBefore(exercise.sets, index)
      ? [{ value: 'percent_of_top_set' as const, label: '% top set' }]
      : []),
  ];

  const setLoadMode = (mode: LoadMode) => {
    if (mode === loadModeOf(set)) return;
    if (mode === 'kg') patch({ weightMode: 'absolute', weightPercent: null, weightKg: null });
    else
      patch({
        weightMode: mode,
        weightPercent: mode === 'percent_of_top_set' ? 85 : 75,
        weightKg: null,
      });
  };

  const done = () => {
    const parsed = parseTempoInput(tempo);
    if (parsed === undefined) {
      setTempoError('Four numbers, like 3-1-1-0 (X = explosive).');
      return;
    }
    if (parsed !== set.tempo) patch({ tempo: parsed });
    close();
  };

  return (
    <Sheet visible onClose={done} title={`Set ${index + 1}`}>
      <View className="gap-lg pb-sm">
        <View className="gap-sm">
          <Text variant="label" tone="muted">
            Set type
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {setTypes.map((t: SetType) => (
              <Chip
                key={t}
                label={setTypeInfo[t].name}
                selected={set.setType === t}
                disabled={t === 'drop' && index === 0}
                onPress={() => {
                  haptics.selection();
                  patch({ setType: t });
                }}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {setTypeInfo[set.setType].description}
          </Text>
        </View>
        {logType === 'weight_reps' ? (
          <View className="gap-sm">
            <Text variant="label" tone="muted">
              Load
            </Text>
            <SegmentedControl
              accessibilityLabel="Load"
              options={loadOptions}
              value={loadModeOf(set)}
              onChange={setLoadMode}
            />
          </View>
        ) : null}
        <Input
          label="Tempo (optional)"
          value={tempo}
          onChangeText={setTempo}
          placeholder="3-1-1-0"
          autoCapitalize="characters"
          autoCorrect={false}
          error={tempoError}
          helperText="Seconds down, pause, up, pause."
        />
        <View className="flex-row gap-sm">
          <Button
            label="Delete set"
            icon="trash-outline"
            variant="outline"
            className="flex-1"
            onPress={() => {
              editRoutine((d) => deleteSet(d, exercise.id, set.id));
              close();
            }}
          />
          <Button label="Done" className="flex-1" onPress={done} />
        </View>
      </View>
    </Sheet>
  );
}
