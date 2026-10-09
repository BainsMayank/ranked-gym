import { randomUUID } from 'expo-crypto';
import { useState } from 'react';

import { showToast } from '@/components';
import {
  copyRoutine,
  useDeleteRoutine,
  usePatchRoutines,
  useSaveRoutine,
  type RoutineListItem,
} from '@/lib/routines';
import { loadRoutineDoc } from '@/lib/routines/repository';

/**
 * List actions for a routine. Delete hides the routine at once and only commits when the Undo
 * toast goes away; archive commits at once and Undo restores it.
 */
export function useRoutineActions() {
  const patch = usePatchRoutines();
  const remove = useDeleteRoutine();
  const save = useSaveRoutine();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const unhide = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const duplicate = async (routine: RoutineListItem) => {
    const doc = await loadRoutineDoc(routine.id);
    if (!doc) return;
    await save.mutateAsync(copyRoutine(doc, randomUUID, new Date().toISOString()));
    showToast({ message: `Duplicated ${routine.name}` });
  };

  const move = (routine: RoutineListItem, folderId: string | null) =>
    patch.mutate([{ id: routine.id, patch: { folderId } }]);

  const setArchived = (routine: RoutineListItem, archived: boolean) => {
    patch.mutate([{ id: routine.id, patch: { archived } }]);
    if (archived) {
      showToast({
        message: `Archived ${routine.name}`,
        actionLabel: 'Undo',
        onAction: () => patch.mutate([{ id: routine.id, patch: { archived: false } }]),
      });
    }
  };

  const del = (routine: RoutineListItem) => {
    setHidden((prev) => new Set(prev).add(routine.id));
    showToast({
      message: `Deleted ${routine.name}`,
      actionLabel: 'Undo',
      onAction: () => unhide(routine.id),
      onDismiss: () => remove.mutate(routine.id, { onSettled: () => unhide(routine.id) }),
    });
  };

  return { hidden, duplicate, move, setArchived, delete: del };
}
