import { View } from 'react-native';

import { Button, ReorderList, Text } from '@/components';
import { supersetPositions } from '@/lib/routines';

import { moveExercise } from '../actions';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';

const ROW = 64;

/** Reorder mode: compact rows dragged by their handle (Move up / down for screen readers). */
export function ReorderSession() {
  const store = useSessionStore();
  const env = useSessionEnv();
  const exercises = useSession((s) => s.doc?.exercises ?? []);
  const positions = supersetPositions(exercises);
  const items = exercises.map((e, i) => ({ e, position: positions[i] ?? null }));

  return (
    <View className="gap-md px-lg pb-xl">
      <View className="flex-row items-center gap-sm">
        <Text variant="caption" tone="muted" className="flex-1">
          Drag the handle to reorder. Moving an exercise away from its superset takes it out.
        </Text>
        <Button
          label="Done"
          variant="secondary"
          size="sm"
          onPress={() => store.getState().setReordering(false)}
        />
      </View>
      <ReorderList
        data={items}
        keyExtractor={(item) => item.e.id}
        rowHeight={ROW}
        itemLabel={({ e, position }) =>
          [position && `${position.letter}${position.index}`, env.nameOf(e.exerciseId)]
            .filter(Boolean)
            .join(', ')
        }
        onReorder={(from, to) => store.getState().apply((d) => moveExercise(d, from, to))}
        renderItem={({ e, position }) => (
          <View className="mr-xs h-14 flex-row items-center gap-md rounded-md border-t border-edge bg-surface px-lg">
            <Text variant="label" tone="primary" className="w-6">
              {position ? `${position.letter}${position.index}` : ''}
            </Text>
            <View className="flex-1">
              <Text variant="subheading" numberOfLines={1}>
                {env.nameOf(e.exerciseId)}
              </Text>
              <Text variant="caption" tone="muted">
                {e.sets.filter((s) => s.completed).length} of {e.sets.length} sets done
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
