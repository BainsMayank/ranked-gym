import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, SegmentedControl, Text } from '@/components';
import { useGoals } from '@/lib/insights';

import { GoalCard } from '../insights/GoalCard';
import { GoalCelebration } from '../insights/GoalCelebration';
import { InsightFrame } from '../insights/InsightFrame';

export function GoalsScreen() {
  const query = useGoals();
  const router = useRouter();
  const [filter, setFilter] = useState('active');
  const goals = (query.data ?? []).filter((g) => g.status === filter);
  return (
    <InsightFrame
      title="Goals"
      query={query}
      scroll={false}
      footer={<Button label="Create goal" icon="add" onPress={() => router.push('/goals/edit')} />}
    >
      <View className="pb-lg">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'achieved', label: 'Achieved' },
            { value: 'archived', label: 'Archived' },
          ]}
          accessibilityLabel="Goal status"
        />
      </View>
      <FlashList
        data={goals}
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching && !query.isPending}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <View className="pb-lg">
            <GoalCard goal={item} />
          </View>
        )}
        ListEmptyComponent={
          <View className="gap-md py-xl">
            <Text variant="heading">
              {filter === 'active' ? 'What are you working towards?' : `No ${filter} goals`}
            </Text>
            <Text tone="muted">
              {filter === 'active'
                ? 'Pick a next lift, build consistency or set a personal milestone.'
                : 'Your goals will appear here.'}
            </Text>
          </View>
        }
      />
      <GoalCelebration goals={query.data ?? []} />
    </InsightFrame>
  );
}
