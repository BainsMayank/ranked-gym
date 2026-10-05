import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';

import { cn } from '@/lib/utils';
import { rankColors, type RankTier } from '@/theme';

import { Text } from './Text';

/** Divisions run IV (lowest) → I (highest). Count is an open decision (docs/PRODUCT_SPEC.md). */
export type RankDivision = 1 | 2 | 3 | 4;

export interface RankBadgeProps {
  tier: RankTier;
  /** Ignored for Master and Champion, which have no divisions. */
  division?: RankDivision;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

const ROMAN: Record<RankDivision, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
const TIERS_WITHOUT_DIVISIONS: readonly RankTier[] = ['master', 'champion'];

export function rankLabel(tier: RankTier, division?: RankDivision): string {
  const name = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (!division || TIERS_WITHOUT_DIVISIONS.includes(tier)) return name;
  return `${name} ${ROMAN[division]}`;
}

const SHIELD = 'M50 4 L92 20 V56 C92 82 72 100 50 108 C28 100 8 82 8 56 V20 Z';
const INNER = 'M50 14 L83 27 V56 C83 76 68 90 50 97 C32 90 17 76 17 56 V27 Z';
const STAR = '50,30 55,44 70,44 58,53 62,67 50,59 38,67 42,53 30,44 45,44';

/** Placeholder rank art: a tier-tinted shield. Final art is a Phase 7/14 task. */
export function RankBadge({
  tier,
  division,
  size = 64,
  showLabel = false,
  className,
}: RankBadgeProps) {
  const c = rankColors[tier];
  const label = rankLabel(tier, division);
  const hasDivision = !!division && !TIERS_WITHOUT_DIVISIONS.includes(tier);
  const gradientId = `rank-${tier}`;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} rank`}
      className={cn('items-center gap-xs', className)}
    >
      <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.highlight} />
            <Stop offset="1" stopColor={c.base} />
          </LinearGradient>
        </Defs>
        <Path d={SHIELD} fill={`url(#${gradientId})`} />
        <Path d={INNER} fill="none" stroke={c.on} strokeOpacity={0.35} strokeWidth={3} />
        {hasDivision && division ? (
          <SvgText x="50" y="68" fontSize="30" fontWeight="800" fill={c.on} textAnchor="middle">
            {ROMAN[division]}
          </SvgText>
        ) : (
          <Polygon points={STAR} fill={c.on} />
        )}
      </Svg>
      {showLabel ? <Text variant="label">{label}</Text> : null}
    </View>
  );
}
