import { View } from 'react-native';

import { Screen, SectionHeader } from '@/components';

import { DisciplineCards } from '../components/DisciplineCards';
import { LiftRanksList } from '../components/LiftRanksList';
import { RankHeroCard } from '../components/RankHeroCard';
import { RankProgressChart } from '../components/RankProgressChart';
import { TierStrip } from '../components/TierStrip';

/** Rank → Ranks: overall rank hero, the tier ladder, discipline ranks, progression and per-lift ranks. */
export function MyRanksScreen() {
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <RankHeroCard />
        <TierStrip />
        <DisciplineCards />
        <RankProgressChart />
        <SectionHeader title="Lifts" meta="e1RM · bodyweight ratio" />
        <LiftRanksList />
      </View>
    </Screen>
  );
}
