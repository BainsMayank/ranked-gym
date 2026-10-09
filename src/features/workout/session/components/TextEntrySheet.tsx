import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Sheet } from '@/components';
import { WORKOUT_LIMITS } from '@/lib/workouts';

import { renameWorkout, updateExercise } from '../actions';
import { useSession, useSessionStore } from '../store';

/** Rename the workout or write an exercise note. */
export function TextEntrySheet() {
  const store = useSessionStore();
  const sheet = useSession((s) => s.sheet);
  const doc = useSession((s) => s.doc);
  const kind = sheet?.kind === 'rename' || sheet?.kind === 'notes' ? sheet : null;
  const exercise =
    kind?.kind === 'notes' ? doc?.exercises.find((e) => e.id === kind.exerciseId) : undefined;
  const current = kind?.kind === 'rename' ? (doc?.name ?? '') : (exercise?.notes ?? '');
  const key = kind ? `${kind.kind}:${kind.kind === 'notes' ? kind.exerciseId : ''}` : null;
  const [text, setText] = useState(current);
  const [openFor, setOpenFor] = useState<string | null>(null);
  if (key !== openFor) {
    setOpenFor(key);
    setText(current);
  }
  const close = () => store.getState().openSheet(null);
  const save = () => {
    if (kind?.kind === 'rename') store.getState().apply((d) => renameWorkout(d, text));
    if (kind?.kind === 'notes') {
      store
        .getState()
        .apply((d) => updateExercise(d, kind.exerciseId, { notes: text.trim() || null }));
    }
    close();
  };
  const renaming = kind?.kind === 'rename';

  return (
    <Sheet visible={!!kind} onClose={close} title={renaming ? 'Rename workout' : 'Exercise note'}>
      <View className="gap-md pb-sm">
        <Input
          label={renaming ? 'Name' : 'Note'}
          value={text}
          onChangeText={setText}
          autoFocus
          maxLength={renaming ? WORKOUT_LIMITS.nameMax : WORKOUT_LIMITS.exerciseNotesMax}
          multiline={!renaming}
          autoCapitalize="sentences"
          autoComplete="off"
          textContentType="none"
          returnKeyType={renaming ? 'done' : 'default'}
          onSubmitEditing={renaming ? save : undefined}
          placeholder={renaming ? 'Leg day' : 'Seat on 4, belt for the top set'}
        />
        <Button
          label="Save"
          variant="secondary"
          disabled={renaming && !text.trim()}
          onPress={save}
        />
      </View>
    </Sheet>
  );
}
