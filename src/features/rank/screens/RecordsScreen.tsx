import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, EmptyState, Screen, SegmentedControl, Skeleton, useTabBarInset } from '@/components';
import type { PrKind } from '@/lib/game/engine/records';
import { groupRecords, RECORD_KIND_LABELS, usePersonalRecords, useServerReads } from '@/lib/ranks';
import { useProfile } from '@/lib/profile';
import { spacing } from '@/theme';

import { RecordGroupCard } from '../components/RecordGroupCard';
import { SignedOutRanks } from '../components/SignedOutRanks';
import { useNow } from '../hooks/useNow';

const KINDS: (PrKind | 'all')[] = [
  'all',
  'e1rm',
  'weight',
  'reps_at_weight',
  'set_volume',
  'session_volume',
  'hold',
];
const RANGES = [
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
  { value: 'all', label: 'All' },
] as const;
type Range = (typeof RANGES)[number]['value'];

/** Rank → Records: every personal record grouped by exercise, filtered by kind and date. */
export function RecordsScreen() {
  const signedIn = useServerReads();
  const records = usePersonalRecords();
  const unit = useProfile().data?.units ?? 'kg';
  const bottom = useTabBarInset();
  const [kind, setKind] = useState<PrKind | 'all'>('all');
  const [range, setRange] = useState<Range>('all');
  const now = useNow(60 * 60_000);
  const groups = useMemo(
    () =>
      groupRecords(records.data ?? [], {
        kind,
        since: range === 'all' ? null : new Date(now - Number(range) * 86_400_000).toISOString(),
      }),
    [records.data, kind, range, now],
  );

  if (!signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutRanks what="records" />
      </Screen>
    );
  }

  const header = (
    <View className="gap-md pb-md pt-sm">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-sm"
      >
        {KINDS.map((k) => (
          <Chip
            key={k}
            label={k === 'all' ? 'All' : RECORD_KIND_LABELS[k]}
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </ScrollView>
      <SegmentedControl
        options={RANGES}
        value={range}
        onChange={setRange}
        accessibilityLabel="Records from"
      />
      {records.isLoading ? <Skeleton height={160} radius="lg" /> : null}
      {records.isError ? (
        <EmptyState
          title="Records could not load"
          action={{ label: 'Try again', onPress: () => void records.refetch() }}
        />
      ) : null}
      {!records.isLoading && !records.isError && groups.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={records.data?.length ? 'No records match' : 'No records yet'}
          description={
            records.data?.length
              ? 'Try another record type or a longer range.'
              : 'Log a workout; your first sets become the baseline and every beat after is a PR.'
          }
        />
      ) : null}
    </View>
  );

  return (
    <Screen edges={[]} padded={false} bleedBottom>
      <FlashList
        data={groups}
        keyExtractor={(g) => g.exerciseId}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View className="pb-md">
            <RecordGroupCard group={item} unit={unit} />
          </View>
        )}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: bottom + spacing.lg,
        }}
      />
    </Screen>
  );
}
