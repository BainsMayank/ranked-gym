import { useState } from 'react';
import { View } from 'react-native';

import { Card, ProgressBar, RankTag, Screen, Text } from '@/components';
import { tierName } from '@/lib/game';
import { rankColors, type RankTier } from '@/theme';

import { BodyFigure } from '../components/BodyFigure';
import { MuscleGrid } from '../components/MuscleGrid';
import { muscles, type MuscleId } from '../mocks';

const LEGEND: RankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

/** Rank → Body: front/back figures coloured by muscle rank, the selected muscle's detail, and the grid. */
export function BodyMapScreen() {
  const [selected, setSelected] = useState<MuscleId>('quads');
  const [width, setWidth] = useState(0);
  const m = muscles[selected];
  const figureWidth = Math.min(150, (width - 32) / 2);

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <Card className="gap-md" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View className="flex-row justify-around">
            {(['front', 'back'] as const).map((side) => (
              <View key={side} className="items-center gap-sm">
                <Text variant="overline" tone="muted">
                  {side}
                </Text>
                {figureWidth > 0 ? (
                  <View
                    accessible
                    accessibilityRole="image"
                    accessibilityLabel={`Body map, ${side}. Use the muscle list below to choose a muscle.`}
                  >
                    <BodyFigure
                      side={side}
                      selected={selected}
                      onSelect={setSelected}
                      width={figureWidth}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap justify-center gap-md">
            {LEGEND.map((t) => (
              <View key={t} className="flex-row items-center gap-xs">
                <View
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: rankColors[t].base }}
                />
                <Text variant="caption" tone="muted">
                  {tierName(t)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card className="gap-sm">
          <View className="flex-row items-center justify-between">
            <Text variant="title">{m.name}</Text>
            <RankTag tier={m.rank.tier} division={m.rank.division} size="md" />
          </View>
          <ProgressBar
            progress={m.progress}
            rankTier={m.rank.tier}
            accessibilityLabel={`${m.name} progress to next division`}
          />
          <Text variant="caption" tone="muted">
            {Math.round(m.progress * 100)}% to next division · {m.detail}
          </Text>
        </Card>

        <MuscleGrid selected={selected} onSelect={setSelected} />
      </View>
    </Screen>
  );
}
