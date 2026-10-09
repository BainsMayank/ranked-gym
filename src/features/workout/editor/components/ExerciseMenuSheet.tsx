import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';

import { Icon, ListGroup, ListItem, Sheet } from '@/components';

import {
  duplicateExercise,
  removeExercise,
  removeFromSuperset,
  supersetWithNext,
} from '../actions';
import { useEditorEnv } from '../EditorEnv';
import { editRoutine, useRoutineEditor } from '../store';

/** The card's overflow menu. Replace keeps the sets; the screen runs the picker. */
export function ExerciseMenuSheet({ onReplace }: { onReplace: (exerciseId: string) => void }) {
  const router = useRouter();
  const { exercises } = useEditorEnv();
  const sheet = useRoutineEditor((s) => s.sheet);
  const doc = useRoutineEditor((s) => s.doc);
  const close = () => useRoutineEditor.getState().openSheet(null);

  const id = sheet?.kind === 'menu' ? sheet.exerciseId : null;
  const index = doc?.exercises.findIndex((e) => e.id === id) ?? -1;
  const exercise = index >= 0 ? doc!.exercises[index]! : null;
  const info = exercise ? exercises.get(exercise.exerciseId) : undefined;
  const hasNext = !!doc && index >= 0 && index < doc.exercises.length - 1;

  const run = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <Sheet visible={!!exercise} onClose={close} title={info?.name ?? 'Exercise'}>
      {exercise ? (
        <ListGroup className="mb-sm">
          <ListItem
            title="Replace exercise"
            subtitle="Keeps your sets"
            leading={<Icon name="swap-horizontal" size={20} tone="textMuted" />}
            onPress={() => run(() => onReplace(exercise.id))}
          />
          {exercise.supersetGroup !== null ? (
            <ListItem
              title="Remove from superset"
              leading={<Icon name="git-commit-outline" size={20} tone="textMuted" />}
              onPress={() => run(() => editRoutine((d) => removeFromSuperset(d, exercise.id)))}
            />
          ) : null}
          {hasNext ? (
            <ListItem
              title={
                exercise.supersetGroup !== null
                  ? 'Add next exercise to superset'
                  : 'Superset with next'
              }
              subtitle="Do them back to back"
              leading={<Icon name="link-outline" size={20} tone="textMuted" />}
              onPress={() => run(() => editRoutine((d) => supersetWithNext(d, exercise.id)))}
            />
          ) : null}
          <ListItem
            title="Duplicate"
            leading={<Icon name="copy-outline" size={20} tone="textMuted" />}
            onPress={() =>
              run(() => editRoutine((d) => duplicateExercise(d, exercise.id, randomUUID)))
            }
          />
          {info ? (
            <ListItem
              title="How to do it"
              leading={<Icon name="information-circle-outline" size={20} tone="textMuted" />}
              onPress={() =>
                run(() => router.push({ pathname: '/exercises/[id]', params: { id: info.id } }))
              }
            />
          ) : null}
          <ListItem
            title="Remove exercise"
            leading={<Icon name="trash-outline" size={20} tone="danger" />}
            onPress={() => run(() => editRoutine((d) => removeExercise(d, exercise.id)))}
          />
        </ListGroup>
      ) : null}
    </Sheet>
  );
}
