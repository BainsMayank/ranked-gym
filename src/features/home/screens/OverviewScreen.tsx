import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ListItem, Text } from '@/components';
import { recordLine, useAnalytics } from '@/lib/insights';
import { BodyweightSheet } from '../insights/BodyweightSheet';
import { InsightFrame } from '../insights/InsightFrame';
import { RangeControl } from '../insights/RangeControl';
import { OverviewMetrics } from '../insights/OverviewMetrics';
import { OverviewCharts } from '../insights/OverviewCharts';
const ranges = [7, 14, 30, 90].map((n) => ({ value: String(n), label: `${n} days` }));
export function OverviewScreen() {
  const [range, setRange] = useState('14'),
    [logOpen, setLogOpen] = useState(false);
  const query = useAnalytics(Number(range)),
    data = query.data;
  const router = useRouter();
  return (
    <InsightFrame title="Overview" query={query} scroll={false}>
      <FlashList
        data={data?.records ?? []}
        keyExtractor={(r) => r.id}
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching && !query.isPending}
        ListHeaderComponent={
          <View className="gap-lg pb-lg">
            <RangeControl value={range} onChange={setRange} options={ranges} />
            <Text variant="caption" tone="muted">
              Compared with the previous {range} days. Workout volume follows the logger’s kg × reps
              convention; bodyweight work uses added load.
            </Text>
            {data ? (
              <>
                <OverviewMetrics data={data} />
                <OverviewCharts data={data} onLog={() => setLogOpen(true)} />
              </>
            ) : null}
            <Text variant="heading">Records in this range</Text>
          </View>
        }
        renderItem={({ item: r }) => (
          <ListItem
            title={r.name}
            subtitle={`${recordLine(r)} · ${new Date(r.at).toLocaleDateString('en-IN')}`}
            onPress={() =>
              router.push({ pathname: '/workouts/[id]', params: { id: r.workout_id } })
            }
          />
        )}
        ListEmptyComponent={
          <Text tone="muted">
            No new records in this range. First-time baselines do not count as PRs.
          </Text>
        }
      />
      <BodyweightSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </InsightFrame>
  );
}
