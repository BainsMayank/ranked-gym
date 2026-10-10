import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, DonutChart, Text } from '@/components';
import { goalProgress, projectedDate, useSaveGoal, type Goal } from '@/lib/insights';
import { errorMessage } from '@/lib/sync/types';
import { useTheme } from '@/theme';

export function GoalCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const { colors } = useTheme();
  const save = useSaveGoal();
  const progress = goalProgress(goal);
  const eta = projectedDate(goal.observations ?? [], goal.target_value);
  const input = {
    id: goal.id,
    type: goal.type,
    target: goal.target,
    deadline: goal.deadline,
    autoPost: goal.auto_post,
  };
  return (
    <Card className="gap-md">
      <View className="flex-row items-center gap-md">
        <DonutChart
          size={64}
          thickness={6}
          slices={[
            { key: 'progress', value: progress, color: colors.primary },
            { key: 'remaining', value: 1 - progress, color: colors.edge },
          ]}
          accessibilityLabel={`${goal.target.title}: ${Math.round(progress * 100)}% complete`}
        >
          <Text variant="label" numeric>
            {Math.round(progress * 100)}%
          </Text>
        </DonutChart>
        <View className="flex-1 gap-xs">
          <Text variant="subheading" numberOfLines={2}>
            {goal.target.title}
          </Text>
          <Text variant="caption" tone={goal.status === 'achieved' ? 'success' : 'muted'} numeric>
            {goal.status === 'achieved'
              ? 'Goal achieved'
              : `${goal.current_value.toFixed(1)} / ${goal.target_value.toFixed(1)}`}
          </Text>
        </View>
      </View>
      <Text variant="caption" tone="muted">
        {goal.deadline ? `Due ${goal.deadline} · ` : ''}
        {goal.status === 'achieved'
          ? 'Saved to your achievements'
          : eta
            ? `Projected ${eta}`
            : 'More data needed for a completion estimate'}
      </Text>
      {goal.status !== 'archived' ? (
        <View className="flex-row flex-wrap gap-sm">
          {goal.status === 'active' && goal.type === 'custom' ? (
            <Button
              label="Mark complete"
              variant="secondary"
              size="sm"
              loading={save.isPending}
              onPress={() => save.mutate({ ...input, target: { ...goal.target, checked: true } })}
            />
          ) : null}
          {goal.status === 'active' ? (
            <Button
              label="Edit"
              variant="outline"
              size="sm"
              onPress={() => router.push({ pathname: '/goals/edit', params: { id: goal.id } })}
            />
          ) : null}
          <Button
            label="Archive"
            variant="ghost"
            size="sm"
            onPress={() => save.mutate({ ...input, archive: true })}
          />
        </View>
      ) : null}
      {save.isError ? <Text tone="danger">{errorMessage(save.error)}</Text> : null}
    </Card>
  );
}
