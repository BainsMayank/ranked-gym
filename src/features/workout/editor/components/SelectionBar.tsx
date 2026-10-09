import { View } from 'react-native';

import { Button, Text } from '@/components';

import { makeSuperset, removeExercise } from '../actions';
import { editRoutine, useRoutineEditor } from '../store';

/** Pinned while selecting exercises (long-press): link them as a superset, or delete them. */
export function SelectionBar() {
  const selected = useRoutineEditor((s) => s.selected);
  const exit = () => useRoutineEditor.getState().setMode('edit');
  const count = selected.length;

  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted" accessibilityLiveRegion="polite">
        {count === 0 ? 'Tap exercises to select them' : `${count} selected`}
      </Text>
      <View className="flex-row gap-sm">
        <Button label="Cancel" variant="ghost" onPress={exit} />
        <Button
          label="Delete"
          variant="outline"
          disabled={count === 0}
          onPress={() => {
            editRoutine((d) => selected.reduce((acc, id) => removeExercise(acc, id), d));
            exit();
          }}
        />
        <Button
          label="Make superset"
          icon="link-outline"
          className="flex-1"
          disabled={count < 2}
          onPress={() => {
            editRoutine((d) => makeSuperset(d, selected));
            exit();
          }}
        />
      </View>
    </View>
  );
}
