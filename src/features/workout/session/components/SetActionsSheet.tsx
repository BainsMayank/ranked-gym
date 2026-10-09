import { View } from 'react-native';

import { Chip, Icon, ListGroup, ListItem, Sheet, Text } from '@/components';
import { setTypeInfo, setTypes } from '@/lib/routines';
import { earlierSet, matchPrevious, suggestionFor } from '@/lib/workouts';

import { deleteSet, setSetType, toggleFailed } from '../actions';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';

/** A set's options: its type, "missed it" (attempted, not completed), delete. */
export function SetActionsSheet() {
  const store = useSessionStore();
  const env = useSessionEnv();
  const sheet = useSession((s) => s.sheet);
  const target = sheet?.kind === 'set' ? sheet : null;
  const exercise = useSession((s) => s.doc?.exercises.find((e) => e.id === target?.exerciseId));
  const index = exercise?.sets.findIndex((s) => s.id === target?.setId) ?? -1;
  const set = index >= 0 ? exercise!.sets[index]! : null;
  const close = () => store.getState().openSheet(null);
  const apply = store.getState().apply;

  return (
    <Sheet visible={!!set} onClose={close} title={set ? `Set ${index + 1}` : 'Set'}>
      {set && exercise ? (
        <View className="gap-lg pb-sm">
          <View className="gap-sm">
            <Text variant="label" tone="muted">
              Set type
            </Text>
            <View className="flex-row flex-wrap gap-sm">
              {setTypes.map((type) => (
                <Chip
                  key={type}
                  label={setTypeInfo[type].name}
                  selected={set.setType === type}
                  disabled={type === 'drop' && index === 0}
                  onPress={() => apply((d) => setSetType(d, exercise.id, set.id, type))}
                />
              ))}
            </View>
            <Text variant="caption" tone="muted">
              {setTypeInfo[set.setType].description}
            </Text>
          </View>
          <ListGroup>
            <ListItem
              title={set.failed ? 'Clear "missed"' : 'I missed this set'}
              subtitle="Attempted but couldn't finish the reps"
              leading={<Icon name="close-circle-outline" size={20} tone="textMuted" />}
              onPress={() => {
                const previous = matchPrevious(
                  exercise.sets,
                  env.previous.get(exercise.exerciseId) ?? [],
                )[index];
                const suggestion = suggestionFor(
                  set,
                  previous ?? null,
                  earlierSet(exercise.sets, index),
                );
                apply((d) =>
                  toggleFailed(d, exercise.id, set.id, suggestion, new Date().toISOString()),
                );
                close();
              }}
            />
            <ListItem
              title="Delete set"
              leading={<Icon name="trash-outline" size={20} tone="danger" />}
              onPress={() => {
                apply((d) => deleteSet(d, exercise.id, set.id));
                close();
              }}
            />
          </ListGroup>
        </View>
      ) : null}
    </Sheet>
  );
}
