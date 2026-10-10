import { View } from 'react-native';

import { RankBadge, Text } from '@/components';
import type { CurrentRank } from '@/lib/ranks';
import { useTheme } from '@/theme';

/** Before the overall rank unlocks: placement progress (5 lifts across 4 regions), like placement matches. */
export function PlacementProgress({ overall }: { overall: CurrentRank | null }) {
  const details = overall?.details;
  const lifts = details?.lifts ?? 0;
  const needLifts = details?.needLifts ?? 5;
  const regions = details?.regions ?? 0;
  const needRegions = details?.needRegions ?? 4;

  return (
    <View className="items-center gap-sm self-stretch">
      <View style={{ opacity: 0.35 }}>
        <RankBadge tier="iron" size={80} />
      </View>
      <Text variant="overline" tone="muted" className="mt-sm">
        Placement
      </Text>
      <Text variant="title" numeric>
        {lifts} of {needLifts} lifts ranked
      </Text>
      <Text tone="muted" className="text-center">
        {lifts === 0
          ? 'Log a bench press, squat, deadlift or pull-up to get your first rank.'
          : `Rank ${needLifts} lifts across ${needRegions} body regions to unlock your overall rank.`}
      </Text>
      <View className="mt-md gap-md self-stretch">
        <Notches label="Lifts" value={lifts} total={needLifts} />
        <Notches label="Body regions" value={regions} total={needRegions} />
      </View>
    </View>
  );
}

function Notches({ label, value, total }: { label: string; value: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: total,
        now: Math.min(value, total),
        text: `${value} of ${total}`,
      }}
      className="gap-xs"
    >
      <View className="flex-row justify-between">
        <Text variant="label">{label}</Text>
        <Text variant="label" numeric tone="muted">
          {Math.min(value, total)}/{total}
        </Text>
      </View>
      <View className="flex-row gap-xs">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: i < value ? colors.primary : colors.surfaceRaised }}
          />
        ))}
      </View>
    </View>
  );
}
