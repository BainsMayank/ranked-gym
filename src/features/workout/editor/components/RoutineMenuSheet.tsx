import { Icon, ListGroup, ListItem, Sheet } from '@/components';

import { useRoutineEditor } from '../store';

/** The editor's overflow menu. */
export function RoutineMenuSheet({
  canDelete,
  onDelete,
}: {
  canDelete: boolean;
  onDelete: () => void;
}) {
  const open = useRoutineEditor((s) => s.sheet?.kind === 'routineMenu');
  const count = useRoutineEditor((s) => s.doc?.exercises.length ?? 0);
  const { openSheet, setMode } = useRoutineEditor.getState();
  const close = () => openSheet(null);

  return (
    <Sheet visible={open} onClose={close} title="Routine">
      <ListGroup className="mb-sm">
        {count > 1 ? (
          <ListItem
            title="Reorder exercises"
            leading={<Icon name="reorder-two" size={20} tone="textMuted" />}
            onPress={() => {
              close();
              setMode('reorder');
            }}
          />
        ) : null}
        {count > 1 ? (
          <ListItem
            title="Select exercises"
            subtitle="To make a superset or delete several"
            leading={<Icon name="checkmark-circle-outline" size={20} tone="textMuted" />}
            onPress={() => {
              close();
              setMode('select');
            }}
          />
        ) : null}
        {canDelete ? (
          <ListItem
            title="Delete routine"
            leading={<Icon name="trash-outline" size={20} tone="danger" />}
            onPress={() => {
              close();
              onDelete();
            }}
          />
        ) : null}
      </ListGroup>
    </Sheet>
  );
}
