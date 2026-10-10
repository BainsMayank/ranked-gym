import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BodyMap, Card, EmptyState, Screen, SegmentedControl, Skeleton, Text } from '@/components';
import type { BodyOutline, BodySide } from '@/components/body/paths';
import { muscles, type Muscle } from '@/lib/exercises/taxonomy';
import { useExercises } from '@/lib/exercises';
import {
  liftMusclesFromLibrary,
  liftScores,
  muscleBreakdown,
  useRanks,
  type CurrentRank,
} from '@/lib/ranks';
import { useSyncStatusStore } from '@/lib/sync';
import { rankColors, rankTiers, spacing, useTheme } from '@/theme';
import { tierName } from '@/lib/game';

import { MuscleGrid } from '../components/MuscleGrid';
import { MuscleRankSheet } from '../components/MuscleRankSheet';
import { SignedOutRanks } from '../components/SignedOutRanks';
import { useRankOverview } from '../hooks/useRankOverview';

const VIEWS = [
  { value: 'both', label: 'Both' },
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
] as const;
const OUTLINES = [
  { value: 'male', label: 'Male outline' },
  { value: 'female', label: 'Female outline' },
] as const;

/** Licensed anatomy with server-ranked muscles and an accessible grouped list. */
export function BodyMapScreen() {
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [side, setSide] = useState<BodySide | 'both'>('both');
  const overview = useRankOverview();
  const [outlineChoice, setOutline] = useState<BodyOutline | null>(null);
  const outline: BodyOutline = outlineChoice ?? (overview.sex === 'female' ? 'female' : 'male');
  const [width, setWidth] = useState(0);
  const query = useRanks();
  const library = useExercises();
  const liftMuscles = useMemo(() => liftMusclesFromLibrary(library.data ?? []), [library.data]);
  const online = useSyncStatusStore((s) => s.online);
  const { colors } = useTheme();
  const ranks = useMemo(() => {
    const result: Partial<Record<Muscle, CurrentRank>> = {};
    for (const row of query.data ?? []) {
      if (row.scope === 'muscle' && muscles.includes(row.key as Muscle))
        result[row.key as Muscle] = row;
    }
    return result;
  }, [query.data]);
  const current = selected ? ranks[selected] : undefined;
  const breakdown = useMemo(
    () =>
      selected
        ? muscleBreakdown(selected, liftScores(query.data ?? []), liftMuscles, overview.ladder)
        : null,
    [selected, query.data, liftMuscles, overview.ladder],
  );

  if (!overview.signedIn) {
    return (
      <Screen edges={[]} scroll className="pt-sm">
        <SignedOutRanks what="muscle ranks" />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        {!online ? (
          <Text variant="caption" tone="muted">
            Offline. Showing saved muscle ranks.
          </Text>
        ) : null}
        {query.isError ? (
          <EmptyState
            title="Muscle ranks could not load"
            description={
              query.data?.length
                ? 'Your saved ranks remain on the map.'
                : 'Try again to load your muscle ranks.'
            }
            action={{ label: 'Try again', onPress: () => void query.refetch() }}
          />
        ) : null}
        <Card
          className="gap-md"
          onLayout={(e) => setWidth(Math.max(0, e.nativeEvent.layout.width - spacing.lg * 2))}
        >
          <SegmentedControl
            options={VIEWS}
            value={side}
            onChange={setSide}
            accessibilityLabel="Body view"
          />
          <SegmentedControl
            options={OUTLINES}
            value={outline}
            onChange={setOutline}
            accessibilityLabel="Cosmetic body outline"
          />
          {query.isLoading ? (
            <Skeleton height={320} radius="md" />
          ) : width > 0 ? (
            <BodyMap<CurrentRank>
              values={ranks}
              colourScale={(value) => (value.rank ? rankColors[value.rank.tier].base : undefined)}
              side={side}
              outline={outline}
              width={width}
              selected={selected}
              onMusclePress={setSelected}
              zoomable
              showLabels
              accessibilityLabel="Muscle ranks. Choose a muscle from the list below for details."
            />
          ) : null}
          <Text variant="caption" tone="muted" className="text-center">
            Tap a muscle for its rank. Pinch to zoom; double-tap to reset.
          </Text>
          <View className="flex-row flex-wrap justify-center gap-md">
            {rankTiers.map((tier) => (
              <View key={tier} className="flex-row items-center gap-xs">
                <View
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: rankColors[tier].base }}
                />
                <Text variant="caption" tone="muted">
                  {tierName(tier)}
                </Text>
              </View>
            ))}
            <View className="flex-row items-center gap-xs">
              <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: colors.border }} />
              <Text variant="caption" tone="muted">
                Unranked
              </Text>
            </View>
          </View>
        </Card>
        {!query.isLoading && !Object.values(ranks).some((r) => r.rank) ? (
          <Text tone="muted">
            Log a bench press to unlock your chest ranks. Each ranked lift colours the muscles it
            trains.
          </Text>
        ) : null}
        <MuscleGrid selected={selected} ranks={ranks} onSelect={setSelected} />
      </View>
      <MuscleRankSheet
        muscle={selected}
        rank={current}
        breakdown={breakdown}
        ladder={overview.ladder}
        lifts={overview.lifts}
        onClose={() => setSelected(null)}
      />
    </Screen>
  );
}
