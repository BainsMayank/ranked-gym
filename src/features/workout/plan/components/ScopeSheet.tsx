import { View } from 'react-native';

import { OptionCard, Sheet, Text } from '@/components';
import type { EditScope } from '@/lib/plans';

interface ScopeSheetProps {
  visible: boolean;
  title: string;
  label: string;
  onPick: (scope: EditScope) => void;
  onClose: () => void;
}

/** Swap and regenerate ask how far the change goes: this session, or every week's. */
export function ScopeSheet({ visible, title, label, onPick, onClose }: ScopeSheetProps) {
  const pick = (scope: EditScope) => {
    onClose();
    onPick(scope);
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View className="gap-sm">
        <Text variant="body" tone="muted">
          Change {label} for this session only, or every week it comes up?
        </Text>
        <OptionCard
          wide
          title="Just this session"
          subtitle="Other weeks stay as they are."
          selected={false}
          onPress={() => pick('day')}
        />
        <OptionCard
          wide
          title="Every week"
          subtitle="Done sessions keep what you logged."
          selected={false}
          onPress={() => pick('every')}
        />
      </View>
    </Sheet>
  );
}
