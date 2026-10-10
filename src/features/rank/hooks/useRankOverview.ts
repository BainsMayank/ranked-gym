import { useMemo } from 'react';

import {
  useLiftBests,
  useRankLadder,
  useRankLifts,
  useRankPredictions,
  useRanks,
  useServerReads,
  type LiftBest,
  type RankPrediction,
} from '@/lib/ranks';
import { useProfile } from '@/lib/profile';
import type { WeightUnit } from '@/lib/units';

/** Everything My Ranks and Analysis read, joined by rank key. */
export function useRankOverview() {
  const ranks = useRanks();
  const ladder = useRankLadder();
  const lifts = useRankLifts();
  const predictions = useRankPredictions();
  const bests = useLiftBests();
  const { data: profile } = useProfile();
  const signedIn = useServerReads();

  const byKey = useMemo(() => {
    const p = new Map<string, RankPrediction>();
    for (const x of predictions.data ?? []) p.set(x.rankKey, x);
    const b = new Map<string, LiftBest>();
    for (const x of bests.data ?? []) b.set(x.rankKey, x);
    return { predictions: p, bests: b };
  }, [predictions.data, bests.data]);

  const unit: WeightUnit = profile?.units ?? 'kg';
  return {
    ranks: ranks.data ?? [],
    ladder: ladder.data,
    lifts: lifts.data ?? [],
    predictions: predictions.data ?? [],
    predictionByKey: byKey.predictions,
    bestByKey: byKey.bests,
    unit,
    signedIn,
    sex: profile?.sex_for_standards ?? 'unspecified',
    isLoading: ranks.isLoading || ladder.isLoading || lifts.isLoading,
    scope: (scope: string) => ranks.data?.find((r) => r.scope === scope && r.key === scope) ?? null,
    isError: ranks.isError,
    refetch: () => Promise.all([ranks.refetch(), predictions.refetch(), bests.refetch()]),
  };
}
