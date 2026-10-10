import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState, Screen, Skeleton } from '@/components';

import { DisciplineCards } from '../components/DisciplineCards';
import { HowRanksWorkSheet } from '../components/HowRanksWorkSheet';
import { LiftRanksList } from '../components/LiftRanksList';
import { ProgressionCard } from '../components/ProgressionCard';
import { RankHeroCard } from '../components/RankHeroCard';
import { SignedOutRanks } from '../components/SignedOutRanks';
import { TierStrip } from '../components/TierStrip';
import { useRankOverview } from '../hooks/useRankOverview';

/** Rank → Ranks: overall rank hero, the tier ladder, discipline ranks, progression and per-lift ranks. */
export function MyRanksScreen() {
  const data = useRankOverview();
  const [info, setInfo] = useState(false);
  const overall = data.scope('overall');

  if (!data.signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutRanks />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        {data.isError ? (
          <EmptyState
            title="Ranks could not load"
            description="Check your connection and try again."
            action={{ label: 'Try again', onPress: () => void data.refetch() }}
          />
        ) : null}
        {data.isLoading ? (
          <View className="gap-lg">
            <Skeleton height={320} radius="lg" />
            <Skeleton height={96} radius="lg" />
            <Skeleton height={260} radius="lg" />
          </View>
        ) : (
          <>
            <RankHeroCard overall={overall} ladder={data.ladder} onInfo={() => setInfo(true)} />
            <TierStrip rank={overall?.status === 'ranked' ? (overall.rank ?? null) : null} />
            <DisciplineCards
              weightlifting={data.scope('weightlifting')}
              calisthenics={data.scope('calisthenics')}
              ladder={data.ladder}
            />
            <ProgressionCard ranks={data.ranks} lifts={data.lifts} ladder={data.ladder} />
            <LiftRanksList
              lifts={data.lifts}
              ranks={data.ranks}
              bests={data.bestByKey}
              predictions={data.predictionByKey}
              ladder={data.ladder}
              unit={data.unit}
            />
          </>
        )}
      </View>
      <HowRanksWorkSheet visible={info} onClose={() => setInfo(false)} />
    </Screen>
  );
}
