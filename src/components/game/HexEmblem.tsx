import Svg, { Path, Polygon } from 'react-native-svg';

export interface HexEmblemProps {
  /** Outline, chevrons and tint colour (usually a rank or rarity colour). */
  color: string;
  size: number;
  /** Number of stacked chevrons inside (0 for a plain hexagon). */
  chevrons?: number;
  /** Draws a star instead of chevrons (top tiers). */
  star?: boolean;
  /** Tint opacity of the inner fill. */
  fillOpacity?: number;
}

const OUTER = '50,4 94,29 94,83 50,108 6,83 6,29';
const STAR = '50,34 55.5,48 70,48 58.5,57 63,71 50,62.5 37,71 41.5,57 30,48 44.5,48';

/** The app's emblem shape (from the mockups): a tinted hexagon with stacked chevrons. */
export function HexEmblem({
  color,
  size,
  chevrons = 2,
  star = false,
  fillOpacity = 0.16,
}: HexEmblemProps) {
  const count = Math.max(0, Math.min(4, chevrons));
  const gap = 12;
  const startY = 56 - ((count - 1) * gap) / 2;

  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Polygon
        points={OUTER}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={5}
        strokeLinejoin="round"
      />
      {star ? <Polygon points={STAR} fill={color} /> : null}
      {!star
        ? Array.from({ length: count }, (_, i) => {
            const y = startY + i * gap;
            return (
              <Path
                key={i}
                d={`M32 ${y + 8} L50 ${y - 4} L68 ${y + 8}`}
                fill="none"
                stroke={color}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })
        : null}
    </Svg>
  );
}
