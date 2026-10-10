import { View } from 'react-native';

import { Card, DonutChart, Text } from '@/components';
import { regionLabels } from '@/lib/exercises/taxonomy';
import { tierName } from '@/lib/game';
import {
  ladderPosition,
  musclesByTier,
  regionShares,
  type CurrentRank,
  type RankLadder,
} from '@/lib/ranks';
import { rankColors, useTheme } from '@/theme';

import { formatScore } from '../format';

/** Where rank points come from (donut by region) and how many muscles sit in each tier. */
export function RegionDonutCard({
  ranks,
  overall,
  ladder,
}: {
  ranks: readonly CurrentRank[];
  overall: CurrentRank | null;
  ladder: RankLadder | undefined;
}) {
  const { colors } = useTheme();
  const shares = regionShares(ranks);
  const tiers = musclesByTier(ranks);
  const tracked = tiers.reduce((s, t) => s + t.count, 0);
  const tierOf = (score: number) => (ladder ? ladderPosition(score, ladder).tier : 'iron');

  return (
    <Card className="gap-lg">
      <Text variant="subheading">Rank points by body region</Text>
      {shares.length === 0 ? (
        <Text tone="muted">Log a squat, a bench press and a row to fill this in.</Text>
      ) : (
        <View className="flex-row items-center gap-lg">
          <DonutChart
            slices={shares.map((s) => ({
              key: s.region,
              value: s.score,
              color: rankColors[tierOf(s.score)].base,
            }))}
            accessibilityLabel={`Rank points by region: ${shares.map((s) => `${regionLabels[s.region]} ${Math.round(s.share * 100)}%`).join(', ')}`}
          >
            <Text variant="heading" numeric>
              {overall?.score != null ? formatScore(overall.score) : '—'}
            </Text>
            <Text variant="overline" tone="muted">
              Overall
            </Text>
          </DonutChart>
          <View className="flex-1 gap-sm">
            {shares.map((s) => (
              <View key={s.region} className="flex-row items-center gap-sm">
                <View
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: rankColors[tierOf(s.score)].base }}
                />
                <Text variant="label" className="flex-1">
                  {regionLabels[s.region]}
                </Text>
                <Text variant="label" numeric>
                  {Math.round(s.share * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View className="gap-xs">
        <Text variant="caption" tone="muted">
          Muscles by tier ({tracked} tracked)
        </Text>
        <View className="h-2 flex-row gap-xxs">
          {tiers.map((t) => (
            <View
              key={t.tier}
              className="rounded-full"
              style={{
                flex: t.count,
                backgroundColor: t.tier === 'unranked' ? colors.border : rankColors[t.tier].base,
              }}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-x-md gap-y-xxs">
          {tiers.map((t) => (
            <Text
              key={t.tier}
              variant="caption"
              style={t.tier === 'unranked' ? undefined : { color: rankColors[t.tier].base }}
              tone={t.tier === 'unranked' ? 'muted' : 'default'}
            >
              {t.count} {t.tier === 'unranked' ? 'unranked' : tierName(t.tier)}
            </Text>
          ))}
        </View>
      </View>
    </Card>
  );
}
