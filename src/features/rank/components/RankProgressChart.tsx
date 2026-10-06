import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Card, SectionHeader, Text } from '@/components';
import { fontFamilies, rankColors, useTheme, type RankTier } from '@/theme';

import { overall, progression } from '../mocks';

const HEIGHT = 140;
/** Ladder ordinals per tier band (4 divisions each): silver 8–12, gold 12–16, platinum 16–20. */
const BANDS: { tier: RankTier; from: number; to: number }[] = [
  { tier: 'silver', from: 8, to: 12 },
  { tier: 'gold', from: 12, to: 16 },
  { tier: 'platinum', from: 16, to: 20 },
];
const MIN = 8;
const MAX = 20;

/** 12-week rank line over tier bands. Simple SVG until Victory Native (Phase 7). */
export function RankProgressChart() {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const y = (v: number) => HEIGHT - ((v - MIN) / (MAX - MIN)) * HEIGHT;
  const x = (i: number) => (i / (progression.weeks.length - 1)) * (width - 8) + 4;
  const points = progression.weeks.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const line = rankColors[overall.rank.tier].base;
  const last = progression.weeks.length - 1;

  return (
    <Card className="gap-md">
      <SectionHeader title="Rank progression" meta="Last 12 weeks" />
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Rank over the last 12 weeks. ${progression.note}`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: HEIGHT }}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {BANDS.map((b) => (
              <Rect
                key={b.tier}
                x={0}
                y={y(b.to)}
                width={width}
                height={y(b.from) - y(b.to)}
                fill={rankColors[b.tier].base}
                fillOpacity={0.07}
              />
            ))}
            {BANDS.map((b) => (
              <SvgText
                key={`${b.tier}-l`}
                x={6}
                y={y(b.to) + 14}
                fontSize={10}
                fontFamily={fontFamilies.medium}
                fill={colors.textMuted}
              >
                {b.tier.toUpperCase()}
              </SvgText>
            ))}
            <Polyline
              points={points}
              fill="none"
              stroke={line}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <Circle cx={x(last)} cy={y(progression.weeks[last] ?? MIN)} r={4} fill={line} />
          </Svg>
        ) : null}
      </View>
      <Text variant="caption" tone="muted">
        {progression.note}
      </Text>
    </Card>
  );
}
