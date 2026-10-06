import { View } from 'react-native';

import type { RankDivision } from '@/lib/game/ranks';
import { cn } from '@/lib/utils';
import type { RankTier } from '@/theme';

import { Avatar } from '../Avatar';
import { Text } from '../Text';
import { RankTag } from './RankTag';

export interface LeaderboardRowProps {
  position: number;
  name: string;
  score: string;
  rank?: { tier: RankTier; division?: RankDivision };
  /** Places moved since last period (+ up, − down, 0 none). */
  movement?: number;
  /** Highlights the signed-in player's row. */
  isYou?: boolean;
  className?: string;
}

/** One standing in a league or leaderboard. Shared by Rank → Leagues and Friends → Leaderboards. */
export function LeaderboardRow({
  position,
  name,
  score,
  rank,
  movement,
  isYou = false,
  className,
}: LeaderboardRowProps) {
  const moveLabel =
    movement === undefined
      ? null
      : movement === 0
        ? '–'
        : movement > 0
          ? `+${movement}`
          : `${movement}`;
  return (
    <View
      accessible
      accessibilityLabel={`${position}. ${isYou ? 'You' : name}, ${score}`}
      className={cn(
        'min-h-14 flex-row items-center gap-md px-lg py-sm',
        isYou && 'border-l-2 border-primary bg-background',
        className,
      )}
    >
      <Text variant="label" tone="muted" numeric className="w-7">
        {position}
      </Text>
      <Avatar name={name} size="sm" />
      <View className="flex-1">
        <Text variant="subheading" numberOfLines={1}>
          {isYou ? 'You' : name}
        </Text>
        {rank ? <RankTag tier={rank.tier} division={rank.division} /> : null}
      </View>
      <Text variant="subheading" numeric>
        {score}
      </Text>
      {moveLabel ? (
        <Text
          variant="label"
          numeric
          tone={!movement ? 'muted' : movement > 0 ? 'success' : 'danger'}
          className="w-7 text-right"
        >
          {moveLabel}
        </Text>
      ) : null}
    </View>
  );
}
