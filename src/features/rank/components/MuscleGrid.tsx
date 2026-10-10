import { View } from 'react-native';

import { PressableScale, RankTag, Text } from '@/components';
import {
  muscleLabels,
  MUSCLES_BY_REGION,
  muscleRegions,
  regionLabels,
  type Muscle,
} from '@/lib/exercises/taxonomy';
import type { CurrentRank } from '@/lib/ranks';
import { rankLabel } from '@/lib/game';

interface MuscleGridProps {
  selected: Muscle | null;
  ranks: Partial<Record<Muscle, CurrentRank>>;
  onSelect: (muscle: Muscle) => void;
}

/** Accessible alternative to small anatomical targets; grouped by the canonical six regions. */
export function MuscleGrid({ selected, ranks, onSelect }: MuscleGridProps) {
  return (
    <View className="gap-xl">
      {muscleRegions.map((region) => (
        <View key={region} className="gap-xs">
          <Text variant="overline" tone="muted">
            {regionLabels[region]}
          </Text>
          {MUSCLES_BY_REGION[region].map((muscle) => {
            const rank = ranks[muscle]?.rank;
            return (
              <PressableScale
                key={muscle}
                accessibilityRole="button"
                accessibilityLabel={`${muscleLabels[muscle]}, ${rank ? rankLabel(rank.tier, rank.division) : 'Unranked'}. View muscle rank.`}
                accessibilityState={{ selected: muscle === selected }}
                className="min-h-14 flex-row items-center justify-between gap-md border-b border-border py-sm"
                onPress={() => onSelect(muscle)}
              >
                <Text className="flex-1">{muscleLabels[muscle]}</Text>
                {rank ? (
                  <RankTag tier={rank.tier} division={rank.division} />
                ) : (
                  <Text variant="caption" tone="muted">
                    Unranked
                  </Text>
                )}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
