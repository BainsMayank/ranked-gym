import { hasDivisions, DIVISIONS, type RankDivision } from '@/lib/game/ranks';
import { rankColors, type RankTier } from '@/theme';

import { HexEmblem } from './HexEmblem';

interface PlaceholderRankArtProps {
  tier: RankTier;
  division?: RankDivision;
  size: number;
}

/**
 * Stand-in until final art is registered in artRegistry.ts: the mockups' hexagon emblem in the
 * tier colour. Chevrons count up through the divisions (III = 1 … I = 3); Champion gets a star.
 */
export function PlaceholderRankArt({ tier, division, size }: PlaceholderRankArtProps) {
  const color = rankColors[tier].base;
  if (!hasDivisions(tier)) return <HexEmblem color={color} size={size} star />;
  const chevrons = division ? DIVISIONS.indexOf(division) + 1 : 2;
  return <HexEmblem color={color} size={size} chevrons={chevrons} />;
}
