import { View } from 'react-native';

import { Icon } from '../Icon';
import { Text } from '../Text';

export interface StreakChipProps {
  days: number;
}

/** Current streak (flame + days) for headers. */
export function StreakChip({ days }: StreakChipProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${days}-day streak`}
      className="h-11 flex-row items-center gap-xs rounded-full bg-surface px-md"
    >
      <Icon name="flame" size={16} tone="streak" />
      <Text variant="subheading" tone="streak" numeric>
        {days}
      </Text>
    </View>
  );
}
