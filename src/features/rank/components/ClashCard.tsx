import { View } from 'react-native';

import { Card, Text } from '@/components';
import { useTheme } from '@/theme';

import { clash } from '../mocks';

/** Community vs community tug of war: your side in the signal colour. */
export function ClashCard() {
  const { colors } = useTheme();
  const total = clash.home.points + clash.away.points;
  const share = clash.home.points / total;
  const fmt = (n: number) => n.toLocaleString('en-IN');

  return (
    <Card className="gap-sm">
      <View className="flex-row justify-between">
        <Text variant="subheading" tone="primary" numeric>
          {clash.home.name} · {fmt(clash.home.points)}
        </Text>
        <Text variant="subheading" tone="muted" numeric>
          {clash.away.name} · {fmt(clash.away.points)}
        </Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${clash.home.name} ${fmt(clash.home.points)} versus ${clash.away.name} ${fmt(clash.away.points)}`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }}
        className="h-2 flex-row gap-xxs"
      >
        <View className="rounded-full" style={{ flex: share, backgroundColor: colors.primary }} />
        <View
          className="rounded-full"
          style={{ flex: 1 - share, backgroundColor: colors.textMuted }}
        />
      </View>
      <Text variant="caption" tone="muted">
        {clash.note}
      </Text>
    </Card>
  );
}
