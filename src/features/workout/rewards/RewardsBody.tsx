import { View } from 'react-native';

import { SectionHeader, Text } from '@/components';
import { headlineChange, type WorkoutRewards } from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

import { BodyweightPrompt } from './BodyweightPrompt';
import { PlacementProgress } from './PlacementProgress';
import { PrList } from './PrList';
import { RankChangeList } from './RankChangeList';
import { RankUpReveal } from './RankUpReveal';

interface RewardsBodyProps {
  rewards: WorkoutRewards;
  unit: WeightUnit;
  /** The summary screen celebrates; history just lists. */
  reveal?: boolean;
}

/** Records and rank changes from one workout, as the server scored them. */
export function RewardsBody({ rewards, unit, reveal = false }: RewardsBodyProps) {
  const headline = reveal ? headlineChange(rewards.rankChanges) : null;
  const { prs, rankChanges, placement, baselines, needsBodyweight, flagged } = rewards;
  const nothingNew = prs.length === 0 && rankChanges.length === 0;

  return (
    <View className="gap-xl">
      {headline ? <RankUpReveal change={headline} /> : null}

      {prs.length > 0 ? (
        <View className="gap-sm">
          <SectionHeader
            title={prs.length === 1 ? '1 personal record' : `${prs.length} personal records`}
          />
          <PrList prs={prs} unit={unit} />
        </View>
      ) : null}

      {rankChanges.length > (headline ? 1 : 0) ? (
        <View className="gap-sm">
          <SectionHeader title="Rank changes" />
          <RankChangeList changes={rankChanges} skip={headline} />
        </View>
      ) : null}

      {nothingNew ? (
        <Text tone="muted">No new records or ranks this time. Every set still counts.</Text>
      ) : null}

      {baselines > 0 ? (
        <Text variant="caption" tone="muted">
          First time on {baselines} {baselines === 1 ? 'exercise' : 'exercises'}: today’s numbers
          are the baseline your next records have to beat.
        </Text>
      ) : null}

      {placement && !placement.placed ? <PlacementProgress placement={placement} /> : null}
      {needsBodyweight ? <BodyweightPrompt /> : null}

      {flagged > 0 ? (
        <Text variant="caption" tone="muted">
          {flagged === 1 ? 'One set looks' : `${flagged} sets look`} unusually heavy, so{' '}
          {flagged === 1 ? 'it’s' : 'they’re'} held back from ranks and records until checked. If it
          was a typo, edit the workout.
        </Text>
      ) : null}
    </View>
  );
}
