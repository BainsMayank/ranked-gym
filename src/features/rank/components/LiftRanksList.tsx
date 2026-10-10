import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, ListGroup, SectionHeader } from '@/components';
import type { CurrentRank, LiftBest, RankLadder, RankLift, RankPrediction } from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

import { LiftRankRow } from './LiftRankRow';

export interface LiftRanksListProps {
  lifts: readonly RankLift[];
  ranks: readonly CurrentRank[];
  bests: ReadonlyMap<string, LiftBest>;
  predictions: ReadonlyMap<string, RankPrediction>;
  ladder: RankLadder | undefined;
  unit: WeightUnit;
}

/** Every rankable lift: ranked ones by score, then the rest under "Not ranked yet". */
export function LiftRanksList({
  lifts,
  ranks,
  bests,
  predictions,
  ladder,
  unit,
}: LiftRanksListProps) {
  const [showAll, setShowAll] = useState(false);
  const byKey = new Map(ranks.filter((r) => r.scope === 'lift').map((r) => [r.key, r]));
  const ranked = lifts
    .filter((l) => byKey.get(l.rankKey)?.score != null)
    .sort((a, b) => (byKey.get(b.rankKey)?.score ?? 0) - (byKey.get(a.rankKey)?.score ?? 0));
  const unranked = lifts.filter((l) => byKey.get(l.rankKey)?.score == null);
  const shownUnranked = showAll ? unranked : unranked.slice(0, ranked.length ? 3 : 6);

  const row = (l: RankLift) => (
    <LiftRankRow
      key={l.rankKey}
      name={l.name}
      rank={byKey.get(l.rankKey)}
      best={bests.get(l.rankKey)}
      prediction={predictions.get(l.rankKey)}
      ladder={ladder}
      unit={unit}
      onPress={() => router.push({ pathname: '/lift/[key]', params: { key: l.rankKey } })}
    />
  );

  return (
    <View className="gap-lg">
      {ranked.length ? (
        <View className="gap-sm">
          <SectionHeader title="Your lifts" meta={`${ranked.length} ranked`} />
          <ListGroup>{ranked.map(row)}</ListGroup>
        </View>
      ) : null}
      {unranked.length ? (
        <View className="gap-sm">
          <SectionHeader title="Not ranked yet" meta={`${unranked.length} lifts`} />
          <ListGroup>{shownUnranked.map(row)}</ListGroup>
          {unranked.length > shownUnranked.length ? (
            <Button
              label={`Show all ${unranked.length}`}
              variant="ghost"
              onPress={() => setShowAll(true)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
