import { useWorkoutRewards } from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

import { RewardsBody } from './RewardsBody';

interface WorkoutRewardsSectionProps {
  workoutId: string;
  unit: WeightUnit;
}

/** Records and rank changes on a workout in History, once the server has scored it. */
export function WorkoutRewardsSection({ workoutId, unit }: WorkoutRewardsSectionProps) {
  const { data: state } = useWorkoutRewards(workoutId);
  if (state?.status !== 'ready') return null;
  return <RewardsBody rewards={state.rewards} unit={unit} />;
}
