import { View } from 'react-native';

import { ReorderList, Text } from '@/components';
import { supersetPositions, type RoutineDoc } from '@/lib/routines';
import { cn } from '@/lib/utils';

import { moveExercise } from '../actions';
import { useEditorEnv } from '../EditorEnv';
import { editRoutine } from '../store';

const ROW = 64;

/** Reorder mode: compact rows dragged by their handle. Moving a member out splits its superset. */
export function ReorderExercises({ doc }: { doc: RoutineDoc }) {
  const { exercises } = useEditorEnv();
  const positions = supersetPositions(doc.exercises);
  const items = doc.exercises.map((e, i) => ({ e, position: positions[i] ?? null }));

  return (
    <View className="gap-md">
      <Text variant="caption" tone="muted">
        Drag the handle to reorder. Moving an exercise away from its superset takes it out.
      </Text>
      <ReorderList
        data={items}
        keyExtractor={(item) => item.e.id}
        rowHeight={ROW}
        itemLabel={({ e, position }) =>
          [
            position && `${position.letter}${position.index}`,
            exercises.get(e.exerciseId)?.name ?? 'Exercise',
          ]
            .filter(Boolean)
            .join(', ')
        }
        onReorder={(from, to) => editRoutine((d) => moveExercise(d, from, to))}
        renderItem={({ e, position }) => (
          <View
            className={cn(
              'mr-xs h-14 flex-row items-center gap-md rounded-md border-t border-edge bg-surface px-lg',
            )}
          >
            <Text variant="label" tone="primary" className="w-6">
              {position ? `${position.letter}${position.index}` : ''}
            </Text>
            <View className="flex-1">
              <Text variant="subheading" numberOfLines={1}>
                {exercises.get(e.exerciseId)?.name ?? 'Exercise'}
              </Text>
              <Text variant="caption" tone="muted">
                {e.sets.length} {e.sets.length === 1 ? 'set' : 'sets'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
