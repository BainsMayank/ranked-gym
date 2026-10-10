import { View } from 'react-native';

import {
  DivisionLadder,
  IconButton,
  ProgressBar,
  RankBadge,
  RankGlow,
  Tag,
  Text,
} from '@/components';
import { rankLabel } from '@/lib/game';
import { ladderPosition, pointsToNext, type CurrentRank, type RankLadder } from '@/lib/ranks';
import { rankColors } from '@/theme';

import { formatScore } from '../format';
import { PlacementProgress } from './PlacementProgress';

export interface RankHeroCardProps {
  overall: CurrentRank | null;
  ladder: RankLadder | undefined;
  onInfo: () => void;
}

/** The overall rank: badge, tier, Rank Score and the division ladder. The screen's one hero. */
export function RankHeroCard({ overall, ladder, onInfo }: RankHeroCardProps) {
  const rank = overall?.status === 'ranked' ? overall.rank : null;
  const score = overall?.score ?? null;

  return (
    <View className="relative items-center gap-sm overflow-hidden rounded-lg border-t border-edge bg-surface px-lg py-xl">
      {rank ? <RankGlow tier={rank.tier} intensity={0.22} /> : null}
      <View className="absolute right-sm top-sm">
        <IconButton
          icon="information-circle-outline"
          accessibilityLabel="How ranks work"
          onPress={onInfo}
          variant="ghost"
        />
      </View>
      {rank && score !== null ? (
        <>
          <View style={{ opacity: overall?.inactive ? 0.45 : 1 }}>
            <RankBadge tier={rank.tier} division={rank.division} size={96} />
          </View>
          <Text variant="overline" tone="muted" className="mt-sm">
            Overall rank
          </Text>
          <Text
            variant="display"
            className="text-center"
            style={{ color: rankColors[rank.tier].base }}
          >
            {rankLabel(rank.tier, rank.division)}
          </Text>
          <Text tone="muted">
            Rank Score{' '}
            <Text numeric className="text-text">
              {formatScore(score)}
            </Text>
          </Text>
          {overall?.inactive ? (
            <Tag
              label="Inactive · log a ranked lift to resume"
              tone="neutral"
              icon="pause-outline"
            />
          ) : null}
          <HeroProgress score={score} rank={rank} ladder={ladder} />
        </>
      ) : (
        <PlacementProgress overall={overall} />
      )}
    </View>
  );
}

function HeroProgress({
  score,
  rank,
  ladder,
}: {
  score: number;
  rank: NonNullable<CurrentRank['rank']>;
  ladder: RankLadder | undefined;
}) {
  if (!ladder) return null;
  const position = ladderPosition(score, ladder);
  const toNext = pointsToNext(score, ladder);
  const next = position.next
    ? rankLabel(position.next.tier, position.next.division ?? undefined)
    : null;
  return (
    <View className="mt-md gap-xs self-stretch">
      {rank.division ? (
        <DivisionLadder
          tier={rank.tier}
          division={rank.division}
          progress={position.progress}
          tierColored
        />
      ) : (
        <ProgressBar
          progress={
            (score - (ladder.thresholds.at(-1)?.minScore ?? 950)) /
            (ladder.maxScore - (ladder.thresholds.at(-1)?.minScore ?? 950))
          }
          rankTier={rank.tier}
          accessibilityLabel={`${formatScore(score)} of ${ladder.maxScore} points`}
        />
      )}
      <Text variant="label" numeric tone="muted">
        {toNext !== null && next
          ? `${toNext} pts to ${next}`
          : `${formatScore(score)} of ${ladder.maxScore}: the top of the ladder`}
      </Text>
    </View>
  );
}
