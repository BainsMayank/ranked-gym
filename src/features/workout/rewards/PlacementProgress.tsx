import { View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import type { Placement } from '@/lib/ranks';

interface PlacementProgressProps {
  placement: Placement;
}

/** "Placement: 3/5 lifts" until the overall rank unlocks, like placement matches in games. */
export function PlacementProgress({ placement }: PlacementProgressProps) {
  const { lifts, regions, needLifts, needRegions } = placement;
  const progress =
    (Math.min(lifts, needLifts) + Math.min(regions, needRegions)) / (needLifts + needRegions);
  return (
    <View className="gap-sm rounded-lg border-t border-edge bg-surface p-lg">
      <Text variant="subheading">
        Placement: {Math.min(lifts, needLifts)}/{needLifts} lifts
      </Text>
      <ProgressBar progress={progress} accessibilityLabel="Overall rank placement progress" />
      <Text variant="caption" tone="muted">
        Your overall rank unlocks after {needLifts} ranked lifts across {needRegions} body regions (
        {Math.min(regions, needRegions)}/{needRegions} so far).
      </Text>
    </View>
  );
}
