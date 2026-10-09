import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { Icon, ListGroup, ListItem, Sheet } from '@/components';
import { formatRest } from '@/lib/routines';

import { removeExercise, removeFromSuperset, supersetWithNext } from '../actions';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';

/** A card's menu: notes, rest, replace, supersets, reorder, how-to, remove. */
export function ExerciseActionsSheet({ onReplace }: { onReplace: (exerciseId: string) => void }) {
  const store = useSessionStore();
  const router = useRouter();
  const env = useSessionEnv();
  const sheet = useSession((s) => s.sheet);
  const doc = useSession((s) => s.doc);
  const id = sheet?.kind === 'exercise' ? sheet.exerciseId : null;
  const index = doc?.exercises.findIndex((e) => e.id === id) ?? -1;
  const exercise = index >= 0 ? doc!.exercises[index]! : null;
  const info = exercise ? env.exercises.get(exercise.exerciseId) : undefined;
  const hasNext = !!doc && index >= 0 && index < doc.exercises.length - 1;
  const { openSheet, apply, setReordering } = store.getState();
  const close = () => openSheet(null);
  const run = (fn: () => void) => {
    close();
    fn();
  };
  const leading = (name: Parameters<typeof Icon>[0]['name']) => (
    <Icon name={name} size={20} tone="textMuted" />
  );

  return (
    <Sheet visible={!!exercise} onClose={close} title={info?.name ?? 'Exercise'}>
      {exercise ? (
        <ListGroup className="mb-sm">
          <ListItem
            title={exercise.notes ? 'Edit note' : 'Add a note'}
            leading={leading('create-outline')}
            onPress={() => openSheet({ kind: 'notes', exerciseId: exercise.id })}
          />
          <ListItem
            title="Rest timer"
            value={formatRest(exercise.restSeconds)}
            leading={leading('timer-outline')}
            onPress={() => openSheet({ kind: 'restTime', exerciseId: exercise.id })}
          />
          <ListItem
            title="Replace exercise"
            subtitle="Keeps your sets"
            leading={leading('swap-horizontal')}
            onPress={() => run(() => onReplace(exercise.id))}
          />
          {hasNext ? (
            <ListItem
              title={
                exercise.supersetGroup !== null ? 'Add next to superset' : 'Superset with next'
              }
              subtitle="Do them back to back, rest after the round"
              leading={leading('link-outline')}
              onPress={() => run(() => apply((d) => supersetWithNext(d, exercise.id)))}
            />
          ) : null}
          {exercise.supersetGroup !== null ? (
            <ListItem
              title="Remove from superset"
              leading={leading('git-commit-outline')}
              onPress={() => run(() => apply((d) => removeFromSuperset(d, exercise.id)))}
            />
          ) : null}
          {doc && doc.exercises.length > 1 ? (
            <ListItem
              title="Reorder exercises"
              leading={leading('swap-vertical')}
              onPress={() => run(() => setReordering(true))}
            />
          ) : null}
          {info ? (
            <ListItem
              title="How to do it"
              leading={leading('information-circle-outline')}
              onPress={() =>
                run(() => router.push({ pathname: '/exercises/[id]', params: { id: info.id } }))
              }
            />
          ) : null}
          <ListItem
            title="Remove exercise"
            leading={<Icon name="trash-outline" size={20} tone="danger" />}
            onPress={() => {
              const logged = exercise.sets.some((s) => s.completed);
              const remove = () => run(() => apply((d) => removeExercise(d, exercise.id)));
              if (!logged) return remove();
              Alert.alert(`Remove ${info?.name ?? 'this exercise'}?`, 'Its logged sets go too.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: remove },
              ]);
            }}
          />
        </ListGroup>
      ) : null}
    </Sheet>
  );
}
