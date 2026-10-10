import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, Text } from '@/components';
import { ROUTINE_LIMITS, useRoutineFolders, type RoutineDoc } from '@/lib/routines';

import { updateMeta } from '../actions';
import { editRoutine, useRoutineEditor } from '../store';
import { ColourPicker } from './ColourPicker';

/** Draft text that follows outside changes (undo) and commits on blur as one undo step. */
function useCommittedText(value: string, commit: (text: string) => void) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value);
  }
  // Commit what the input reports: state can lag when typing and blur land together.
  const onEndEditing = (e: { nativeEvent: { text?: string } }) => {
    const typed = e.nativeEvent.text ?? text;
    if (typed !== value) commit(typed);
  };
  return { text, setText, onEndEditing };
}

/** Name, description, colour and folder at the top of the editor. */
export function RoutineMetaHeader({
  doc,
  restored,
  onDiscard,
}: {
  doc: RoutineDoc;
  restored: boolean;
  onDiscard: () => void;
}) {
  const { data: folders = [] } = useRoutineFolders();
  const folder = folders.find((f) => f.id === doc.folderId);
  const name = useCommittedText(doc.name, (t) => editRoutine((d) => updateMeta(d, { name: t })));
  const description = useCommittedText(doc.description ?? '', (t) =>
    editRoutine((d) => updateMeta(d, { description: t.trim() || null })),
  );

  const credit = doc.source === 'copied' && doc.sourceLabel ? doc.sourceLabel : null;
  const creditUser = credit?.startsWith('@') ? credit.slice(1) : null;

  return (
    <View className="gap-lg pb-lg">
      {credit ? (
        <Text variant="caption" tone="muted">
          Copied from{' '}
          <Text
            variant="caption"
            tone="primary"
            accessibilityRole="link"
            onPress={
              creditUser
                ? () => router.push({ pathname: '/u/[username]', params: { username: creditUser } })
                : undefined
            }
          >
            {credit}
          </Text>
        </Text>
      ) : null}
      {restored ? (
        <View className="flex-row items-center justify-between gap-md">
          <Text variant="caption" tone="muted" className="flex-1">
            {credit
              ? 'Not saved yet. Save to add it to your routines.'
              : 'Restored your unsaved changes.'}
          </Text>
          <Button label="Discard" variant="ghost" size="sm" onPress={onDiscard} />
        </View>
      ) : null}
      <Input
        label="Name"
        value={name.text}
        onChangeText={name.setText}
        onEndEditing={name.onEndEditing}
        placeholder="Leg day"
        maxLength={ROUTINE_LIMITS.nameMax}
        autoCapitalize="sentences"
        returnKeyType="done"
      />
      <Input
        label="Description (optional)"
        value={description.text}
        onChangeText={description.setText}
        onEndEditing={description.onEndEditing}
        placeholder="Focus, cues, when to do it"
        maxLength={ROUTINE_LIMITS.textMax}
        multiline
      />
      <ColourPicker
        value={doc.colour}
        onChange={(colour) => editRoutine((d) => updateMeta(d, { colour }))}
      />
      <Chip
        label={folder ? `Folder: ${folder.name}` : 'No folder'}
        icon="folder-outline"
        onPress={() => useRoutineEditor.getState().openSheet({ kind: 'folder' })}
        accessibilityLabel={`${folder ? `In folder ${folder.name}` : 'No folder'}. Change folder`}
      />
    </View>
  );
}
