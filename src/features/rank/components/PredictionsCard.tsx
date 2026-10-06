import { View } from 'react-native';

import { Card, RankTag, SectionHeader, Text } from '@/components';
import { rankLabel } from '@/lib/game';

import { predictions } from '../mocks';

/** Next rank-up per lift, estimated from the recent trend (server-computed). */
export function PredictionsCard() {
  return (
    <Card className="gap-md">
      <SectionHeader title="Next rank predictions" meta="From your 6-week trend" />
      {predictions.map((p) => (
        <View
          key={p.lift}
          accessible
          accessibilityLabel={`${p.lift} to ${rankLabel(p.target.tier, p.target.division)} in about ${p.weeks} weeks. ${p.need}`}
          className="flex-row items-center gap-md rounded-md bg-surface-raised p-md"
        >
          <View className="flex-1 gap-xxs">
            <View className="flex-row items-center gap-xs">
              <Text variant="subheading">{p.lift} →</Text>
              <RankTag tier={p.target.tier} division={p.target.division} size="md" />
            </View>
            <Text variant="caption" tone="muted">
              {p.need}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="heading" numeric>
              ~{p.weeks} wk
            </Text>
            <Text variant="overline" tone="muted">
              est.
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}
