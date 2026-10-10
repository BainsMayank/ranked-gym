import { View } from 'react-native';

import { Card, Text } from '@/components';
import { rankLabel } from '@/lib/game';
import type { LiftPercentile, RankPrediction } from '@/lib/ranks';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/units';

import { etaText } from '../../format';

const SEX: Record<string, string> = { male: 'men', female: 'women', unspecified: 'lifters' };

function percentileLine(p: LiftPercentile | null | undefined): string {
  if (!p) return 'Percentile unlocks once this lift is ranked.';
  if (p.percentile === null) {
    return `Percentile unlocks when ${p.minCohort}+ lifters like you rank this lift (${p.cohort} so far).`;
  }
  const band =
    p.bwMin !== null && p.bwMax !== null ? ` ${Math.round(p.bwMin)}–${Math.round(p.bwMax)} kg` : '';
  return `Stronger than ${p.percentile}% of ${SEX[p.sex ?? 'unspecified']}${band} on this lift.`;
}

/** Next division: the loads, reps or hold it needs and when at your current pace; plus percentile. */
export function LiftTargetsCard({
  prediction,
  percentile,
  unit,
}: {
  prediction: RankPrediction | undefined;
  percentile: LiftPercentile | null | undefined;
  unit: WeightUnit;
}) {
  const next = prediction?.next;
  const rows = prediction?.loads.length
    ? prediction.loads.map((l) => [
        `${l.reps} rep${l.reps > 1 ? 's' : ''}`,
        formatWeight(l.kg, unit, 0.5),
      ])
    : prediction?.addedLoads.length
      ? prediction.addedLoads.map((l) => [
          `${l.reps} rep${l.reps > 1 ? 's' : ''}`,
          `+${fromKg(l.kg, unit, 0.5)} ${unit}`,
        ])
      : [];

  return (
    <Card className="gap-md">
      <Text variant="subheading">
        {next ? `To reach ${rankLabel(next.tier, next.division)}` : 'Next rank'}
      </Text>
      {!prediction ? <Text tone="muted">Rank this lift to see your next target.</Text> : null}
      {prediction && !next ? <Text tone="muted">You’re at the top of the ladder.</Text> : null}
      {prediction?.needsBodyweight ? (
        <Text tone="muted">Add a weigh-in to see the weights you need.</Text>
      ) : null}
      {rows.map(([reps, load]) => (
        <View key={reps} className="flex-row justify-between">
          <Text tone="muted">{reps}</Text>
          <Text numeric>{load}</Text>
        </View>
      ))}
      {prediction?.reps !== null && prediction?.reps !== undefined && next ? (
        <Text numeric>{prediction.reps} clean reps</Text>
      ) : null}
      {prediction?.seconds != null && next ? (
        <Text numeric>{prediction.seconds} s hold</Text>
      ) : null}
      {prediction && next ? (
        <Text variant="caption" tone="muted">
          Estimate: {etaText(prediction.eta)} from your last 8 weeks
        </Text>
      ) : null}
      <Text variant="caption" tone="muted">
        {percentileLine(percentile)}
      </Text>
    </Card>
  );
}
