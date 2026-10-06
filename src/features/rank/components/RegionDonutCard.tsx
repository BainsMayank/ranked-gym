import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card, Text } from '@/components';
import { tierName } from '@/lib/game';
import { rankColors, useTheme } from '@/theme';

import { overall, regions, tierCounts } from '../mocks';

const SIZE = 132;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Where rank points come from (donut) and how many muscles sit in each tier (stacked bar). */
export function RegionDonutCard() {
  const { colors } = useTheme();
  const offsets = regions.map((_, i) =>
    regions.slice(0, i).reduce((sum, r) => sum + r.share * C, 0),
  );
  const totalMuscles = tierCounts.reduce((s, t) => s + t.count, 0);

  return (
    <Card className="gap-lg">
      <Text variant="subheading">Rank points by body region</Text>
      <View className="flex-row items-center gap-lg">
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Rank points by region: ${regions.map((r) => `${r.name} ${Math.round(r.share * 100)}%`).join(', ')}`}
          className="items-center justify-center"
        >
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={colors.surfaceRaised}
              strokeWidth={STROKE}
              fill="none"
            />
            {regions.map((r, i) => {
              const len = r.share * C;
              return (
                <Circle
                  key={r.name}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={rankColors[r.tier].base}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - 3)} ${C}`}
                  strokeDashoffset={-(offsets[i] ?? 0)}
                />
              );
            })}
          </Svg>
          <View className="absolute items-center">
            <Text variant="heading" numeric>
              {overall.powerScore.toLocaleString('en-IN')}
            </Text>
            <Text variant="overline" tone="muted">
              Power
            </Text>
          </View>
        </View>
        <View className="flex-1 gap-sm">
          {regions.map((r) => (
            <View key={r.name} className="flex-row items-center gap-sm">
              <View
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: rankColors[r.tier].base }}
              />
              <Text variant="label" className="flex-1">
                {r.name}
              </Text>
              <Text variant="label" numeric>
                {Math.round(r.share * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View className="gap-xs">
        <Text variant="caption" tone="muted">
          Muscles by tier ({totalMuscles} tracked)
        </Text>
        <View className="h-2 flex-row gap-xxs">
          {tierCounts.map((t) => (
            <View
              key={t.tier}
              className="rounded-full"
              style={{ flex: t.count, backgroundColor: rankColors[t.tier].base }}
            />
          ))}
        </View>
        <View className="flex-row justify-between">
          {tierCounts.map((t) => (
            <Text key={t.tier} variant="caption" style={{ color: rankColors[t.tier].base }}>
              {t.count} {tierName(t.tier)}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}
