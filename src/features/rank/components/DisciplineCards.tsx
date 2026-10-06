import { View } from 'react-native';

import { ProgressBar, RankTag, Text } from '@/components';

import { disciplines } from '../mocks';

/** Weightlifting and calisthenics ranks side by side. `detailed` adds score and progress (Analysis). */
export function DisciplineCards({ detailed = false }: { detailed?: boolean }) {
  return (
    <View className="flex-row gap-sm">
      {disciplines.map((d) => (
        <View
          key={d.name}
          className="flex-1 gap-xs rounded-lg border-t border-edge bg-surface p-lg"
        >
          <Text variant="caption" tone="muted">
            {d.name}
          </Text>
          <RankTag tier={d.rank.tier} division={d.rank.division} size="md" />
          {detailed ? (
            <ProgressBar
              progress={d.progress}
              rankTier={d.rank.tier}
              height={4}
              accessibilityLabel={`${d.name} progress`}
            />
          ) : null}
          <Text variant="caption" tone="muted">
            {detailed ? d.score : d.meta}
          </Text>
        </View>
      ))}
    </View>
  );
}
