import { View } from 'react-native';
import { Chip, Text } from '@/components';
import { rankLabel } from '@/lib/game';
import { useRankLadder, useRankLifts } from '@/lib/ranks';
import type { GoalTarget } from '@/lib/insights';

export function RankGoalFields({
  target,
  setTarget,
}: {
  target: GoalTarget;
  setTarget: (target: GoalTarget) => void;
}) {
  const { data: ladder } = useRankLadder();
  const { data: lifts } = useRankLifts();
  return (
    <>
      <Text variant="subheading">Overall or a lift</Text>
      <View className="flex-row flex-wrap gap-sm">
        <Chip
          label="Overall"
          selected={target.scope === 'overall'}
          onPress={() => setTarget({ ...target, scope: 'overall', key: 'overall' })}
        />
        {(lifts ?? []).map((l) => (
          <Chip
            key={l.rankKey}
            label={l.name}
            selected={target.scope === 'lift' && target.key === l.rankKey}
            onPress={() => setTarget({ ...target, scope: 'lift', key: l.rankKey })}
          />
        ))}
      </View>
      <Text variant="subheading">Reach this division</Text>
      <View className="flex-row flex-wrap gap-sm">
        {(ladder?.thresholds ?? []).map((t) => (
          <Chip
            key={t.minScore}
            label={rankLabel(t.tier, t.division ?? undefined)}
            selected={target.score === t.minScore}
            onPress={() => setTarget({ ...target, score: t.minScore })}
          />
        ))}
      </View>
      {!ladder ? <Text tone="muted">Connect to load the rank divisions.</Text> : null}
    </>
  );
}
