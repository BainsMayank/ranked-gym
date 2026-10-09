import { View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import { groupLabels, volumeGroups, type GroupTarget, type VolumeGroup } from '@/lib/plans';

interface VolumeBarsProps {
  sets: Record<VolumeGroup, number>;
  targets: Record<VolumeGroup, GroupTarget>;
  /** A week with fewer sessions than usual (the first or a shifted week): no under-target flags. */
  partial?: boolean;
}

/**
 * Weekly hard sets per muscle group against the level's range. Neutral bars; a group under its
 * floor is the exception and says so.
 */
export function VolumeBars({ sets, targets, partial = false }: VolumeBarsProps) {
  const scale = Math.max(...volumeGroups.map((g) => Math.max(targets[g].max, sets[g])));
  return (
    <View className="gap-sm">
      {volumeGroups.map((g) => {
        const n = Math.round(sets[g]);
        const t = targets[g];
        const under = !partial && sets[g] < t.floor - 0.01;
        return (
          <View
            key={g}
            accessible
            accessibilityLabel={`${groupLabels[g]}: ${n} sets a week${t.role === 'focus' ? ', priority' : ''}${under ? `, under the ${t.floor} you need` : ''}`}
            className="gap-xxs"
          >
            <View className="flex-row items-baseline justify-between">
              <Text variant="label">
                {groupLabels[g]}
                {t.role === 'focus' ? (
                  <Text variant="caption" tone="primary">
                    {'  '}priority
                  </Text>
                ) : null}
              </Text>
              <Text variant="label" tone={under ? 'warning' : 'muted'} numeric>
                {n} {t.floor ? `/ ${t.floor}–${t.max}` : `/ ≤${t.max}`}
              </Text>
            </View>
            <ProgressBar
              progress={sets[g] / scale}
              tone={under ? 'warning' : 'neutral'}
              accessibilityLabel={`${groupLabels[g]} volume`}
              height={4}
            />
          </View>
        );
      })}
    </View>
  );
}
