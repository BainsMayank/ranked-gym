import { View } from 'react-native';

import { Card, RankTag, Text } from '@/components';
import { closestPredictions, type RankLift, type RankPrediction } from '@/lib/ranks';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/units';

import { etaText, liftName, targetPhrase } from '../format';

function loadsLine(p: RankPrediction, unit: WeightUnit): string | null {
  // Barbell lifts: the weight at 1/3/5/8 reps. Bodyweight lifts: the added load instead of reps.
  if (p.loads.length)
    return p.loads.map((l) => `${l.reps}×${fromKg(l.kg, unit, 0.5)}`).join(' · ') + ` ${unit}`;
  if (p.addedLoads.length)
    return (
      p.addedLoads.map((l) => `${l.reps}×+${fromKg(l.kg, unit, 0.5)}`).join(' · ') + ` ${unit}`
    );
  return null;
}

/** The five lifts closest to their next division: what it takes at 1/3/5/8 reps and when. */
export function PredictionsCard({
  predictions,
  lifts,
  unit,
}: {
  predictions: readonly RankPrediction[];
  lifts: readonly RankLift[];
  unit: WeightUnit;
}) {
  const closest = closestPredictions(predictions, 5);
  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between">
        <Text variant="subheading">Next rank-ups</Text>
        <Text variant="caption" tone="muted">
          From your 8-week trend
        </Text>
      </View>
      {closest.length === 0 ? (
        <Text tone="muted">
          Log a bench press, squat or pull-up to see what your next rank takes.
        </Text>
      ) : null}
      {closest.map((p) => (
        <View key={p.rankKey} className="gap-xxs border-b border-border pb-sm">
          <View className="flex-row items-center gap-sm">
            <Text variant="label" className="flex-1">
              {liftName(p.rankKey, lifts)} →{' '}
              {p.next ? <RankTag tier={p.next.tier} division={p.next.division} /> : null}
            </Text>
            <Text variant="label" numeric>
              {etaText(p.eta)}
            </Text>
          </View>
          <Text variant="caption" tone="muted" numeric>
            {p.needsBodyweight
              ? 'Add a weigh-in to see the weight you need'
              : `Need ${targetPhrase(p, unit) ?? 'a little more'}${p.e1rmKg ? ` (e1RM ${formatWeight(p.e1rmKg, unit, 0.5)})` : ''}`}
          </Text>
          {loadsLine(p, unit) ? (
            <Text variant="caption" tone="muted" numeric>
              {p.loads.length ? 'Reps × load' : 'Or weighted'}: {loadsLine(p, unit)}
            </Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}
