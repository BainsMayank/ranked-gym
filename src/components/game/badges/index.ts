import { createElement } from 'react';

import type { RankTier } from '@/theme';

import type { RankArt, RankArtProps } from '../artRegistry';
import { RankImageArt } from './RankImageArt';

const sources = {
  iron: require('../../../../assets/ranks/iron.png'),
  bronze: require('../../../../assets/ranks/bronze.png'),
  silver: require('../../../../assets/ranks/silver.png'),
  gold: require('../../../../assets/ranks/gold.png'),
  platinum: require('../../../../assets/ranks/platinum.png'),
  diamond: require('../../../../assets/ranks/diamond.png'),
  master: require('../../../../assets/ranks/master.png'),
  champion: require('../../../../assets/ranks/champion.png'),
};

function artwork(tier: RankTier): RankArt {
  function TierArtwork(props: RankArtProps) {
    return createElement(RankImageArt, { ...props, tier, source: sources[tier] });
  }
  return { kind: 'component', Component: TierArtwork };
}

/** Original generated metal/enamel artwork with vector division pips. */
export const badgeArt: Record<RankTier, RankArt> = {
  iron: artwork('iron'),
  bronze: artwork('bronze'),
  silver: artwork('silver'),
  gold: artwork('gold'),
  platinum: artwork('platinum'),
  diamond: artwork('diamond'),
  master: artwork('master'),
  champion: artwork('champion'),
};
