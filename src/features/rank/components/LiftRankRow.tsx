import { View } from 'react-native';

import { Icon, PressableScale, ProgressBar, RankBadge, RankTag, Text } from '@/components';
import { rankLabel } from '@/lib/game';
import {
  ladderPosition,
  type CurrentRank,
  type LiftBest,
  type RankLadder,
  type RankPrediction,
} from '@/lib/ranks';
import type { WeightUnit } from '@/lib/units';

import { liftBestLine, nextTargetLine } from '../format';

export interface LiftRankRowProps {
  name: string;
  rank: CurrentRank | undefined;
  best: LiftBest | undefined;
  prediction: RankPrediction | undefined;
  ladder: RankLadder | undefined;
  unit: WeightUnit;
  onPress: () => void;
}

/** One rankable lift: badge, rank, progress through the division, best set and next target. */
export function LiftRankRow({
  name,
  rank,
  best,
  prediction,
  ladder,
  unit,
  onPress,
}: LiftRankRowProps) {
  const r = rank?.rank;
  const score = rank?.score ?? null;
  const progress = r && score !== null && ladder ? ladderPosition(score, ladder).progress : 0;
  const bestLine = liftBestLine(best, unit);
  const next = r ? nextTargetLine(prediction, unit) : null;
  const status = r ? rankLabel(r.tier, r.division) : 'Not ranked yet';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${status}.${bestLine ? ` ${bestLine}.` : ''}${next ? ` ${next}.` : ''} Open details.`}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-md px-lg py-md"
    >
      {r ? (
        <RankBadge tier={r.tier} division={r.division} size={36} />
      ) : (
        <View className="h-10 w-9 items-center justify-center">
          <Icon name="barbell-outline" tone="textMuted" size={20} />
        </View>
      )}
      <View className="flex-1 gap-xs">
        <View className="flex-row items-center justify-between gap-sm">
          <Text variant="subheading" className="flex-1" numberOfLines={1}>
            {name}
          </Text>
          {r ? (
            <RankTag tier={r.tier} division={r.division} />
          ) : (
            <Text variant="caption" tone="muted">
              Log a set to rank
            </Text>
          )}
        </View>
        {r ? (
          <ProgressBar
            progress={progress}
            rankTier={r.tier}
            height={4}
            accessibilityLabel={`${name} progress`}
          />
        ) : null}
        {bestLine ? (
          <Text variant="caption" tone="muted" numeric>
            {bestLine}
          </Text>
        ) : null}
        {next ? (
          <Text variant="caption" numeric>
            {next}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}
