import { rankLabel, type RankDivision } from '@/lib/game/ranks';
import { cn } from '@/lib/utils';
import { rankColors, type RankTier } from '@/theme';

import { Text } from '../Text';

export interface RankTagProps {
  tier: RankTier;
  division?: RankDivision;
  size?: 'sm' | 'md';
  className?: string;
}

/** A rank written in its tier colour ("Gold III"). Game colour on text only, no pill. */
export function RankTag({ tier, division, size = 'sm', className }: RankTagProps) {
  return (
    <Text
      variant={size === 'sm' ? 'label' : 'subheading'}
      numberOfLines={1}
      className={cn(className)}
      style={{ color: rankColors[tier].base }}
    >
      {rankLabel(tier, division)}
    </Text>
  );
}
