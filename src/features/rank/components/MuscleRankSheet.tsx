import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, PressableScale, ProgressBar, RankBadge, RankTag, Sheet, Text } from '@/components';
import { muscleLabels, type Muscle } from '@/lib/exercises/taxonomy';
import { rankLabel } from '@/lib/game';
import {
  ladderPosition,
  type CurrentRank,
  type MuscleBreakdown,
  type RankLadder,
  type RankLift,
} from '@/lib/ranks';
import { rankColors } from '@/theme';

import { formatScore, liftName } from '../format';

export interface MuscleRankSheetProps {
  muscle: Muscle | null;
  rank: CurrentRank | undefined;
  breakdown: MuscleBreakdown | null;
  ladder: RankLadder | undefined;
  lifts: readonly RankLift[];
  onClose: () => void;
}

/** A muscle's rank, the lifts behind it and the one that would raise it most. */
export function MuscleRankSheet({
  muscle,
  rank,
  breakdown,
  ladder,
  lifts,
  onClose,
}: MuscleRankSheetProps) {
  const r = rank?.rank;
  const score = rank?.score ?? null;
  const progress = score !== null && ladder ? ladderPosition(score, ladder).progress : 0;
  const link = breakdown?.weakestLink;
  const name = muscle ? muscleLabels[muscle] : '';
  const open = (key: string) => {
    onClose();
    router.push({ pathname: '/lift/[key]', params: { key } });
  };

  return (
    <Sheet visible={muscle !== null} onClose={onClose} title={name}>
      <View className="gap-lg pb-md">
        {r && score !== null ? (
          <View className="flex-row items-center gap-md">
            <RankBadge tier={r.tier} division={r.division} size={56} />
            <View className="flex-1 gap-xs">
              <RankTag tier={r.tier} division={r.division} size="md" />
              <ProgressBar
                progress={progress}
                rankTier={r.tier}
                height={4}
                accessibilityLabel={`${name} progress`}
              />
              <Text variant="caption" tone="muted" numeric>
                Rank Score {formatScore(score)}
              </Text>
            </View>
          </View>
        ) : null}

        {breakdown?.contributions.length ? (
          <View className="gap-sm">
            <Text variant="overline" tone="muted">
              Built from
            </Text>
            {breakdown.contributions.map((c) => {
              const t = ladder ? ladderPosition(c.score, ladder) : null;
              return (
                <PressableScale
                  key={c.rankKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${liftName(c.rankKey, lifts)}: ${Math.round(c.share * 100)}% of ${name}, ${t ? rankLabel(t.tier, t.division ?? undefined) : ''}`}
                  onPress={() => open(c.rankKey)}
                  className="min-h-11 flex-row items-center gap-md"
                >
                  <Text className="flex-1">{liftName(c.rankKey, lifts)}</Text>
                  <Text variant="caption" tone="muted" numeric>
                    {Math.round(c.share * 100)}%
                  </Text>
                  {t ? <RankTag tier={t.tier} division={t.division ?? undefined} /> : null}
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {link?.kind === 'raise' && ladder ? (
          <View className="gap-xs rounded-md bg-surface-raised p-md">
            <Text variant="label">Weakest link</Text>
            <Text tone="muted">
              Raising your {liftName(link.rankKey, lifts).toLowerCase()} to{' '}
              <Text style={{ color: rankColors[ladderPosition(link.nextScore, ladder).tier].base }}>
                {rankLabel(
                  ladderPosition(link.nextScore, ladder).tier,
                  ladderPosition(link.nextScore, ladder).division ?? undefined,
                )}
              </Text>{' '}
              would lift your {name.toLowerCase()} by about {Math.max(1, Math.round(link.gain))}{' '}
              points.
            </Text>
          </View>
        ) : null}
        {link?.kind === 'unlock' ? (
          <Text tone="muted">
            Log a {liftName(link.rankKey, lifts).toLowerCase()} to rank your {name.toLowerCase()}.
          </Text>
        ) : null}
        {!r && !link ? (
          <Text tone="muted">
            No ranked lift trains this muscle yet; machine work still counts for records and volume.
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          Muscle ranks blend the lifts that train them, weighted by how much each one does. The body
          outline is cosmetic.
        </Text>
        <Button label="Done" variant="secondary" onPress={onClose} />
      </View>
    </Sheet>
  );
}
