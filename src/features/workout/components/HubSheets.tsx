import { useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, Input, ListGroup, ListItem, Sheet } from '@/components';
import type { RoutineFolder, RoutineListItem } from '@/lib/routines';

import type { RoutineAction } from './RoutineRow';

/** Long press on a routine: the same actions as the swipe. */
export function RoutineActionsSheet({
  routine,
  onAction,
  onClose,
}: {
  routine: RoutineListItem | null;
  onAction: (action: RoutineAction, routine: RoutineListItem) => void;
  onClose: () => void;
}) {
  const run = (action: RoutineAction) => () => {
    if (!routine) return;
    onClose();
    onAction(action, routine);
  };
  return (
    <Sheet visible={!!routine} onClose={onClose} title={routine?.name}>
      <ListGroup className="mb-sm">
        <ListItem
          title="Duplicate"
          leading={<Icon name="copy-outline" size={20} tone="textMuted" />}
          onPress={run('duplicate')}
        />
        <ListItem
          title="Move to folder"
          leading={<Icon name="folder-outline" size={20} tone="textMuted" />}
          onPress={run('move')}
        />
        <ListItem
          title={routine?.archived ? 'Restore from archive' : 'Archive'}
          subtitle={routine?.archived ? undefined : 'Hides it without deleting'}
          leading={<Icon name="archive-outline" size={20} tone="textMuted" />}
          onPress={run('archive')}
        />
        <ListItem
          title="Delete"
          leading={<Icon name="trash-outline" size={20} tone="danger" />}
          onPress={run('delete')}
        />
      </ListGroup>
    </Sheet>
  );
}

/** Name a new folder or rename one. */
export function FolderNameSheet({
  visible,
  folder,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** The folder being renamed, or null to create one. */
  folder: RoutineFolder | null;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [openFor, setOpenFor] = useState<string | null | undefined>(undefined);
  const key = visible ? (folder?.id ?? null) : undefined;
  if (key !== openFor) {
    setOpenFor(key);
    setName(folder?.name ?? '');
  }
  const submit = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={folder ? 'Rename folder' : 'New folder'}>
      <View className="gap-md pb-sm">
        <Input
          label="Folder name"
          value={name}
          onChangeText={setName}
          placeholder="Push Pull Legs"
          maxLength={40}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <Button
          label={folder ? 'Rename' : 'Create folder'}
          onPress={submit}
          disabled={!name.trim()}
        />
      </View>
    </Sheet>
  );
}

/** A folder header's menu. */
export function FolderActionsSheet({
  folder,
  onRename,
  onDelete,
  onClose,
}: {
  folder: RoutineFolder | null;
  onRename: (folder: RoutineFolder) => void;
  onDelete: (folder: RoutineFolder) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={!!folder} onClose={onClose} title={folder?.name}>
      <ListGroup className="mb-sm">
        <ListItem
          title="Rename"
          leading={<Icon name="create-outline" size={20} tone="textMuted" />}
          onPress={() => {
            if (!folder) return;
            onClose();
            onRename(folder);
          }}
        />
        <ListItem
          title="Delete folder"
          subtitle="Its routines stay, without a folder"
          leading={<Icon name="trash-outline" size={20} tone="danger" />}
          onPress={() => {
            if (!folder) return;
            onClose();
            onDelete(folder);
          }}
        />
      </ListGroup>
    </Sheet>
  );
}
