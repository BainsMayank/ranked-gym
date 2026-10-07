import { View } from 'react-native';

import { SectionHeader, Text } from '@/components';

export interface TextListProps {
  title: string;
  items: readonly string[];
  /** Numbered steps instead of bullets. */
  numbered?: boolean;
}

/** A titled list of instructions, tips or mistakes. Renders nothing when empty. */
export function TextList({ title, items, numbered = false }: TextListProps) {
  if (items.length === 0) return null;
  return (
    <View className="gap-sm">
      <SectionHeader title={title} />
      {items.map((item, i) => (
        <View key={i} className="flex-row gap-md">
          <Text variant="body" tone="muted" numeric className="w-5">
            {numbered ? `${i + 1}.` : '•'}
          </Text>
          <Text variant="body" className="flex-1">
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
