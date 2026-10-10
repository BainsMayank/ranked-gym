import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, LineChart, SegmentedControl, SelectField, Skeleton, Text } from '@/components';
import { muscleRegions } from '@/lib/exercises/taxonomy';
import { tierName } from '@/lib/game';
import type { RankScope } from '@/lib/game/engine/types';
import {
  historyRanges,
  latestPromotion,
  rankSeries,
  useRankHistory,
  type CurrentRank,
  type HistoryRange,
  type RankLadder,
  type RankLift,
} from '@/lib/ranks';
import { rankColors, useTheme } from '@/theme';

import { scopeName } from '../format';
import { ScopePickerSheet, type ScopeOption } from './ScopePickerSheet';

const RANGES = historyRanges.map((r) => ({ value: r, label: r }));
const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export interface ProgressionCardProps {
  ranks: readonly CurrentRank[];
  lifts: readonly RankLift[];
  ladder: RankLadder | undefined;
}

/** Rank Score over time with tier bands and rank-up markers; any scope, five ranges. */
export function ProgressionCard({ ranks, lifts, ladder }: ProgressionCardProps) {
  const { colors } = useTheme();
  const [range, setRange] = useState<HistoryRange>('3M');
  const [scope, setScope] = useState<{ scope: RankScope; key: string }>({
    scope: 'overall',
    key: 'overall',
  });
  const [picking, setPicking] = useState(false);
  const history = useRankHistory(scope.scope, scope.key, range);

  const sections = useMemo(() => {
    const has = (s: RankScope, k: string) =>
      ranks.some((r) => r.scope === s && r.key === k && r.score !== null);
    const option = (s: RankScope, k: string): ScopeOption => ({
      scope: s,
      key: k,
      label: scopeName(s, k, lifts),
    });
    return [
      {
        title: 'Overall',
        options: (['overall', 'weightlifting', 'calisthenics'] as const).map((s) => option(s, s)),
      },
      {
        title: 'Body regions',
        options: muscleRegions.filter((r) => has('region', r)).map((r) => option('region', r)),
      },
      {
        title: 'Lifts',
        options: ranks
          .filter((r) => r.scope === 'lift' && r.score !== null)
          .sort((a, b) =>
            scopeName('lift', a.key, lifts).localeCompare(scopeName('lift', b.key, lifts)),
          )
          .map((r) => option('lift', r.key)),
      },
    ];
  }, [ranks, lifts]);

  const series = useMemo(
    () => (history.data && ladder ? rankSeries(history.data, ladder) : null),
    [history.data, ladder],
  );
  const lastTier = history.data?.snapshots.at(-1)?.rank.tier;
  const caption = history.data ? latestPromotion(history.data) : null;
  const label = scopeName(scope.scope, scope.key, lifts);

  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between gap-sm">
        <Text variant="subheading">Rank progression</Text>
        <SelectField value={label} onPress={() => setPicking(true)} className="max-w-48" />
      </View>
      <SegmentedControl
        options={RANGES}
        value={range}
        onChange={setRange}
        accessibilityLabel="Time range"
      />
      {history.isLoading ? (
        <Skeleton height={180} radius="md" />
      ) : series && series.points.length > 1 ? (
        <LineChart
          data={series.points}
          color={lastTier ? rankColors[lastTier].base : colors.primary}
          markers={series.markers.map((m) => ({ ...m, color: rankColors[m.rank.tier].base }))}
          bands={series.bands.map((b) => ({
            from: b.from,
            to: b.to,
            color: rankColors[b.tier].base,
            label: tierName(b.tier),
          }))}
          yDomain={series.yDomain}
          formatX={(x) => DATE.format(new Date(x))}
          accessibilityLabel={`${label} Rank Score over ${range}: from ${Math.round(series.points[0]?.y ?? 0)} to ${Math.round(series.points.at(-1)?.y ?? 0)}. ${caption ?? ''}`}
        />
      ) : (
        <Text tone="muted" className="py-lg text-center">
          {scope.scope === 'overall'
            ? 'Your overall progression starts once you place.'
            : 'Log this lift a few times to see a line here.'}
        </Text>
      )}
      <Text variant="caption" tone="muted">
        {caption ?? 'No rank-ups in this range yet. Dots mark the days you ranked up.'}
      </Text>
      <ScopePickerSheet
        visible={picking}
        onClose={() => setPicking(false)}
        sections={sections}
        selected={scope}
        onSelect={(o) => setScope({ scope: o.scope, key: o.key })}
      />
    </Card>
  );
}
