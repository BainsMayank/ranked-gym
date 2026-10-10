import { useLocalSearchParams } from 'expo-router';

import { useGoals } from '@/lib/insights';

import { GoalForm } from '../insights/GoalForm';
import { InsightFrame } from '../insights/InsightFrame';
import { Text } from '@/components';

export function GoalEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const query = useGoals();
  if (!id) return <GoalForm />;
  const goal = query.data?.find((g) => g.id === id);
  if (!goal)
    return (
      <InsightFrame title="Edit goal" query={query}>
        <Text>Goal not found.</Text>
      </InsightFrame>
    );
  return <GoalForm key={id} initial={goal} />;
}
