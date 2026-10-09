import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Icon, Input, ListGroup, ListItem, Sheet } from '@/components';
import { useRoutineFolders, useSaveFolder } from '@/lib/routines';

interface FolderPickerSheetProps {
  visible: boolean;
  /** The routine's current folder (null = none), marked with a tick. */
  current: string | null;
  title?: string;
  onPick: (folderId: string | null) => void;
  onClose: () => void;
}

/** Pick a folder for a routine, or make a new one on the spot. */
export function FolderPickerSheet({
  visible,
  current,
  title = 'Move to folder',
  onPick,
  onClose,
}: FolderPickerSheetProps) {
  const { data: folders = [] } = useRoutineFolders();
  const saveFolder = useSaveFolder();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const close = () => {
    setNaming(false);
    setName('');
    onClose();
  };
  const pick = (id: string | null) => () => {
    onPick(id);
    close();
  };
  const tick = (id: string | null) =>
    current === id ? <Icon name="checkmark" size={20} tone="text" /> : undefined;

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folder = {
      id: randomUUID(),
      name: trimmed,
      sortOrder: folders.length,
      updatedAt: new Date().toISOString(),
    };
    await saveFolder.mutateAsync(folder);
    onPick(folder.id);
    close();
  };

  return (
    <Sheet visible={visible} onClose={close} title={naming ? 'New folder' : title}>
      {naming ? (
        <View className="gap-md pb-sm">
          <Input
            label="Folder name"
            value={name}
            onChangeText={setName}
            placeholder="Push Pull Legs"
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void create()}
          />
          <Button label="Create and move" onPress={() => void create()} disabled={!name.trim()} />
        </View>
      ) : (
        <ListGroup className="mb-sm">
          <ListItem
            title="No folder"
            onPress={current === null ? undefined : pick(null)}
            trailing={tick(null)}
          />
          {folders.map((f) => (
            <ListItem
              key={f.id}
              title={f.name}
              leading={<Icon name="folder-outline" size={20} tone="textMuted" />}
              onPress={current === f.id ? undefined : pick(f.id)}
              trailing={tick(f.id)}
            />
          ))}
          <ListItem
            title="New folder"
            leading={<Icon name="add" size={20} tone="textMuted" />}
            onPress={() => setNaming(true)}
          />
        </ListGroup>
      )}
    </Sheet>
  );
}
