import { View } from 'react-native';

import { Screen } from '@/components';

import { GoalsCard } from '../components/GoalsCard';
import { MuscleVolumeCard } from '../components/MuscleVolumeCard';
import { OverviewCard } from '../components/OverviewCard';
import { RecoveryCard } from '../components/RecoveryCard';
import { TodayWorkoutCard } from '../components/TodayWorkoutCard';

/** Home → For You: today's session, then muscle volume, recovery, goals and the 14-day overview. */
export function ForYouScreen() {
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <TodayWorkoutCard />
        <MuscleVolumeCard />
        <RecoveryCard />
        <GoalsCard />
        <OverviewCard />
      </View>
    </Screen>
  );
}
