import Svg, { Circle, Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

import { rankColors, type RankTier } from '@/theme';

import type { GameArtProps } from './artRegistry';

/**
 * Season reward avatar frame: a metallic ring with gems at the compass points; Legend adds a crown.
 * Drawn over the avatar, so the centre stays clear.
 */
function SeasonFrame({ size, tier, crown }: GameArtProps & { tier: RankTier; crown: boolean }) {
  const c = rankColors[tier];
  const stroke = Math.max(2, size * 0.06);
  const r = size / 2 - stroke / 2;
  const mid = size / 2;
  const gem = Math.max(2.5, size * 0.07);
  const gems = [
    [mid, stroke / 2],
    [size - stroke / 2, mid],
    [mid, size - stroke / 2],
    [stroke / 2, mid],
  ] as const;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c.highlight} />
          <Stop offset="1" stopColor={c.base} />
        </LinearGradient>
      </Defs>
      <Circle cx={mid} cy={mid} r={r} stroke={FRAME} strokeWidth={stroke} fill="none" />
      {gems.map(([x, y], i) =>
        crown && i === 0 ? null : (
          <Polygon
            key={`${x}-${y}`}
            points={`${x},${y - gem} ${x + gem},${y} ${x},${y + gem} ${x - gem},${y}`}
            fill={c.highlight}
            stroke={c.base}
            strokeWidth={1}
          />
        ),
      )}
      {crown ? (
        <Polygon
          points={`${mid - gem * 2},${stroke + gem} ${mid - gem * 1.4},${stroke - gem * 0.6} ${mid - gem * 0.6},${stroke + gem * 0.2} ${mid},${stroke - gem * 1.2} ${mid + gem * 0.6},${stroke + gem * 0.2} ${mid + gem * 1.4},${stroke - gem * 0.6} ${mid + gem * 2},${stroke + gem}`}
          fill={c.highlight}
          stroke={c.base}
          strokeWidth={1}
        />
      ) : null}
    </Svg>
  );
}

const FRAME = 'url(#frame)';

export function EliteSeasonFrame({ size }: GameArtProps) {
  return <SeasonFrame size={size} tier="platinum" crown={false} />;
}

export function LegendSeasonFrame({ size }: GameArtProps) {
  return <SeasonFrame size={size} tier="champion" crown />;
}
