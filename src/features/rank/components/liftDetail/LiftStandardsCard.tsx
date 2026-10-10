import { View } from 'react-native';

import { Card, RankTag, Text } from '@/components';
import type { LiftStandard } from '@/lib/ranks';
import { formatWeight, type WeightUnit } from '@/lib/units';

const METRIC: Record<LiftStandard['metric'], string> = {
  e1rm_ratio: 'Estimated 1RM',
  reps: 'Clean reps',
  hold_seconds: 'Hold',
};

function value(metric: LiftStandard['metric'], v: number, unit: WeightUnit): string {
  if (metric === 'e1rm_ratio') return formatWeight(v, unit, 0.5);
  if (metric === 'reps') return `${Math.ceil(v)} reps`;
  return `${Math.ceil(v)} s`;
}

/** What each tier needs on this lift for someone of your standards, bodyweight and age. */
export function LiftStandardsCard({
  standards,
  unit,
}: {
  standards: readonly LiftStandard[];
  unit: WeightUnit;
}) {
  return (
    <Card className="gap-md">
      <View className="gap-xxs">
        <Text variant="subheading">Standards for you</Text>
        <Text variant="caption" tone="muted">
          Where each tier starts at your bodyweight and age. Divisions sit evenly in between.
        </Text>
      </View>
      {standards.length === 0 ? (
        <Text tone="muted">Add a weigh-in to see the weights for each tier.</Text>
      ) : null}
      {standards.map((s) => (
        <View key={s.metric} className="gap-xs">
          {standards.length > 1 ? (
            <Text variant="overline" tone="muted">
              {METRIC[s.metric]}
            </Text>
          ) : null}
          {s.anchors.map((a) => (
            <View key={a.score} className="flex-row items-center justify-between">
              <RankTag tier={a.tier} />
              <Text numeric>{value(s.metric, a.value, unit)}</Text>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}
