import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';

interface UnsavedSheetProps {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

/** Leaving with unsaved changes: save, discard, or stay. The draft is kept until then. */
export function UnsavedSheet({
  visible,
  saving,
  onSave,
  onDiscard,
  onKeepEditing,
}: UnsavedSheetProps) {
  return (
    <Sheet visible={visible} onClose={onKeepEditing} title="Save your changes?">
      <View className="gap-sm pb-sm">
        <Text variant="body" tone="muted" className="pb-sm">
          You’ve changed this routine since it was last saved.
        </Text>
        <Button label="Save changes" onPress={onSave} loading={saving} fullWidth />
        <Button label="Discard changes" variant="destructive" onPress={onDiscard} fullWidth />
        <Button label="Keep editing" variant="ghost" onPress={onKeepEditing} fullWidth />
      </View>
    </Sheet>
  );
}
