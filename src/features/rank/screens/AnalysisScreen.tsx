import { View } from 'react-native';

import { EmptyState, Screen, Skeleton } from '@/components';
import { useRankEvents, useRankHistory, type RankHistory } from '@/lib/ranks';

import { BalanceCard } from '../components/BalanceCard';
import { DisciplineCards } from '../components/DisciplineCards';
import { PredictionsCard } from '../components/PredictionsCard';
import { RankUpsCard } from '../components/RankUpsCard';
import { RegionDonutCard } from '../components/RegionDonutCard';
import { SignedOutRanks } from '../components/SignedOutRanks';
import { useRankOverview } from '../hooks/useRankOverview';

/** Score change over a history range (first snapshot is the one before it, when there is one). */
const delta = (h: RankHistory | undefined) => {
  const s = h?.snapshots;
  return s && s.length > 1 ? (s.at(-1)?.score ?? 0) - (s[0]?.score ?? 0) : null;
};

/** Rank → Analysis: discipline scores, predictions, rank-up timing, point sources and balance. */
export function AnalysisScreen() {
  const data = useRankOverview();
  const events = useRankEvents();
  const wl = useRankHistory('weightlifting', 'weightlifting', '1M');
  const cali = useRankHistory('calisthenics', 'calisthenics', '1M');

  if (!data.signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutRanks what="rank analysis" />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        {data.isError ? (
          <EmptyState
            title="Analysis could not load"
            description="Check your connection and try again."
            action={{ label: 'Try again', onPress: () => void data.refetch() }}
          />
        ) : null}
        {data.isLoading ? (
          <View className="gap-lg">
            <Skeleton height={120} radius="lg" />
            <Skeleton height={260} radius="lg" />
            <Skeleton height={220} radius="lg" />
          </View>
        ) : (
          <>
            <DisciplineCards
              weightlifting={data.scope('weightlifting')}
              calisthenics={data.scope('calisthenics')}
              ladder={data.ladder}
              deltas={{ weightlifting: delta(wl.data), calisthenics: delta(cali.data) }}
            />
            <PredictionsCard predictions={data.predictions} lifts={data.lifts} unit={data.unit} />
            <RankUpsCard events={events.data ?? []} />
            <RegionDonutCard
              ranks={data.ranks}
              overall={data.scope('overall')}
              ladder={data.ladder}
            />
            <BalanceCard ranks={data.ranks} overall={data.scope('overall')} />
          </>
        )}
      </View>
    </Screen>
  );
}
