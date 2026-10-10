import { View } from 'react-native';

import { SectionHeader, ShareToFeedButton, Text } from '@/components';
import { headlineChange, type WorkoutRewards } from '@/lib/ranks';
import { useMilestoneMode } from '@/lib/social';

/**
 * After a workout with a record or rank-up: offer to post them (Settings → Privacy → Share
 * milestones: "Ask me"). "Automatically" already posted them; "Never" shows nothing.
 */
export function ShareMilestones({ rewards }: { rewards: WorkoutRewards }) {
  const mode = useMilestoneMode().data;
  const pr = rewards.prs.find((p) => p.kind === 'e1rm') ?? rewards.prs[0];
  const change = headlineChange(rewards.rankChanges);
  const rankUp =
    change && change.kind === 'rank_up' && (change.scope === 'lift' || change.scope === 'overall')
      ? change
      : null;
  if (!mode || mode === 'never' || (!pr && !rankUp)) return null;
  if (mode === 'auto') {
    return (
      <Text variant="caption" tone="muted">
        Your best record and rank-up were shared to your feed. Change this in Settings, Privacy.
      </Text>
    );
  }
  return (
    <View className="gap-sm">
      <SectionHeader title="Share with friends" />
      <View className="flex-row flex-wrap gap-sm">
        {pr ? (
          <ShareToFeedButton
            label={`Share ${pr.exerciseName} PR`}
            milestone={{
              kind: 'pr',
              workoutId: rewards.workoutId,
              exerciseId: pr.exerciseId,
              prKind: pr.kind,
            }}
          />
        ) : null}
        {rankUp ? (
          <ShareToFeedButton
            label="Share rank-up"
            milestone={{
              kind: 'rank_up',
              scope: rankUp.scope,
              key: rankUp.key,
              workoutId: rewards.workoutId,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
