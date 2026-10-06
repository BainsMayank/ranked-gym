import { View } from 'react-native';

import { Screen } from '@/components';

import { BalanceCard } from '../components/BalanceCard';
import { DisciplineCards } from '../components/DisciplineCards';
import { PredictionsCard } from '../components/PredictionsCard';
import { RankUpsCard } from '../components/RankUpsCard';
import { RegionDonutCard } from '../components/RegionDonutCard';

/** Rank → Analysis: discipline scores, predictions, rank-up timing, point sources and balance. */
export function AnalysisScreen() {
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <DisciplineCards detailed />
        <PredictionsCard />
        <RankUpsCard />
        <RegionDonutCard />
        <BalanceCard />
      </View>
    </Screen>
  );
}
