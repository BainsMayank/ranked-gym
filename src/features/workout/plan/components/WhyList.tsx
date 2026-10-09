import { View } from 'react-native';

import { Text } from '@/components';
import type { ExplanationSection } from '@/lib/plans';

/** "Why this plan": the engine's plain-text reasons, section by section. */
export function WhyList({ sections }: { sections: readonly ExplanationSection[] }) {
  return (
    <View className="gap-lg">
      {sections.map((s) => (
        <View key={s.title} className="gap-xs">
          <Text variant="subheading">{s.title}</Text>
          <Text variant="body" tone="muted">
            {s.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
