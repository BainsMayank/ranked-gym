import { Button, ListGroup, ListItem } from '@/components';
import { supersetPositions, type RoutineExercise } from '@/lib/routines';

import { setSummary } from '../format';

interface SessionExercisesProps {
  exercises: readonly RoutineExercise[];
  names: ReadonlyMap<string, string>;
  /** A Swap button per row (session screen). */
  onSwap?: (exercise: RoutineExercise) => void;
}

/** A session's exercises with their sets, reps and rest, in order (A1/A2 for supersets). */
export function SessionExercises({ exercises, names, onSwap }: SessionExercisesProps) {
  const positions = supersetPositions(exercises);
  return (
    <ListGroup>
      {exercises.map((e, i) => {
        const pos = positions[i];
        const name = names.get(e.exerciseId) ?? 'Exercise';
        return (
          <ListItem
            key={e.id}
            title={pos ? `${pos.letter}${pos.index}  ${name}` : name}
            subtitle={setSummary(e)}
            trailing={
              onSwap ? (
                <Button
                  label="Swap"
                  variant="ghost"
                  size="sm"
                  accessibilityLabel={`Swap ${name}`}
                  onPress={() => onSwap(e)}
                />
              ) : undefined
            }
          />
        );
      })}
    </ListGroup>
  );
}
