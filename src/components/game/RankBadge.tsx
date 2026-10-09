import { Image, View } from 'react-native';

import { cn } from '@/lib/utils';
import { rankLabel, type RankDivision } from '@/lib/game/ranks';
import type { RankTier } from '@/theme';

import { Text } from '../Text';
import { rankArt } from './artRegistry';
import { PlaceholderRankArt } from './PlaceholderRankArt';

export interface RankBadgeProps {
  tier: RankTier;
  /** Ignored for Champion (no divisions). */
  division?: RankDivision;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/** Rank emblem. Renders registered art from artRegistry.ts, or the placeholder shield until it lands. */
export function RankBadge({
  tier,
  division,
  size = 64,
  showLabel = false,
  className,
}: RankBadgeProps) {
  const label = rankLabel(tier, division);
  const art = rankArt[tier];

  let emblem = <PlaceholderRankArt tier={tier} division={division} size={size} />;
  if (art?.kind === 'image') {
    const source = (division && art.byDivision?.[division]) || art.source;
    emblem = <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
  } else if (art?.kind === 'component') {
    emblem = <art.Component size={size} division={division} />;
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} rank`}
      className={cn('items-center gap-xs', className)}
    >
      {emblem}
      {showLabel ? <Text variant="label">{label}</Text> : null}
    </View>
  );
}
