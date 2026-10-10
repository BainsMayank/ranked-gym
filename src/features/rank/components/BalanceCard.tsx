import { View } from 'react-native';

import { Card, Tag, Text } from '@/components';
import {
  balanceRatios,
  balanceSuggestion,
  HEALTHY_RANGE,
  regionStandings,
  type BalanceRatio,
  type CurrentRank,
} from '@/lib/ranks';
import { liftScores, regionScores } from '@/lib/ranks';

const STATUS: Record<BalanceRatio['status'], (r: BalanceRatio) => string> = {
  balanced: () => 'Balanced',
  left_heavy: (r) => `${r.leftLabel}-heavy`,
  right_heavy: (r) => `${r.rightLabel}-heavy`,
};

const signedPts = (d: number) => `${d > 0 ? '+' : ''}${Math.round(d)} pts`;

/** Strongest and weakest regions against overall, plus push : pull and upper : lower. */
export function BalanceCard({
  ranks,
  overall,
}: {
  ranks: readonly CurrentRank[];
  overall: CurrentRank | null;
}) {
  const standings = regionStandings(regionScores(ranks), overall?.score ?? null);
  const ratios = balanceRatios(liftScores(ranks));
  const tips = ratios.map(balanceSuggestion).filter((t): t is string => t !== null);
  const strong = standings.slice(0, 2);
  const weak = standings.length > 2 ? standings.slice(-2).reverse() : [];

  return (
    <Card className="gap-md">
      <Text variant="subheading">Strengths and balance</Text>
      {standings.length < 2 && ratios.length === 0 ? (
        <Text tone="muted">Rank a push, a pull and a leg lift to see how balanced you are.</Text>
      ) : null}
      {strong.length ? (
        <View className="gap-xs">
          <Text variant="overline" tone="muted">
            Most developed
          </Text>
          {strong.map((s) => (
            <View key={s.region} className="flex-row justify-between">
              <Text>{s.label}</Text>
              <Text numeric tone="success">
                {signedPts(s.delta)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {weak.length ? (
        <View className="gap-xs">
          <Text variant="overline" tone="muted">
            Least developed
          </Text>
          {weak.map((s) => (
            <View key={s.region} className="flex-row justify-between">
              <Text>{s.label}</Text>
              <Text numeric tone="warning">
                {signedPts(s.delta)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {ratios.map((r) => (
        <View key={r.key} className="flex-row items-center gap-md">
          <View className="flex-1">
            <Text variant="label">{r.label}</Text>
            <Text variant="caption" tone="muted">
              Healthy range {HEALTHY_RANGE[0]}–{HEALTHY_RANGE[1]}
            </Text>
          </View>
          <Text variant="heading" numeric>
            {r.ratio.toFixed(2)}
          </Text>
          <Tag label={STATUS[r.status](r)} tone={r.status === 'balanced' ? 'success' : 'warning'} />
        </View>
      ))}
      {tips.map((t) => (
        <Text key={t} tone="muted">
          {t}.
        </Text>
      ))}
    </Card>
  );
}
