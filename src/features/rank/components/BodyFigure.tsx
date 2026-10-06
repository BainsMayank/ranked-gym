import Svg, { Circle, Ellipse, G, Polygon, Rect } from 'react-native-svg';

import { rankColors, useTheme } from '@/theme';

import { muscles, type MuscleId } from '../mocks';

type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'poly'; points: string };

const mirror = (cx: number) => [cx, 100 - cx];
const pairEllipse = (cx: number, cy: number, rx: number, ry: number): Shape[] =>
  mirror(cx).map((x) => ({ kind: 'ellipse', cx: x, cy, rx, ry }));

/** Simple body silhouettes (viewBox 100 × 190). Each muscle is one or more shapes. */
const FRONT: Partial<Record<MuscleId, Shape[]>> = {
  shoulders: pairEllipse(27, 40, 10, 8),
  chest: [
    { kind: 'rect', x: 36, y: 33, w: 13, h: 18, r: 5 },
    { kind: 'rect', x: 51, y: 33, w: 13, h: 18, r: 5 },
  ],
  biceps: pairEllipse(19, 61, 5, 11),
  forearms: pairEllipse(17, 86, 4.5, 12),
  core: [{ kind: 'rect', x: 37, y: 54, w: 26, h: 30, r: 7 }],
  quads: pairEllipse(43, 120, 7, 20),
  calves: pairEllipse(43, 162, 5.5, 14),
};

const BACK: Partial<Record<MuscleId, Shape[]>> = {
  traps: [{ kind: 'poly', points: '38,29 62,29 71,40 58,44 50,39 42,44 29,40' }],
  shoulders: pairEllipse(25, 42, 8, 7),
  lats: [{ kind: 'poly', points: '35,45 65,45 63,70 55,79 45,79 37,70' }],
  triceps: pairEllipse(19, 61, 5, 11),
  forearms: pairEllipse(17, 86, 4.5, 12),
  lowerBack: [{ kind: 'rect', x: 41, y: 80, w: 18, h: 9, r: 4 }],
  glutes: [
    { kind: 'circle', cx: 44, cy: 98, r: 8 },
    { kind: 'circle', cx: 56, cy: 98, r: 8 },
  ],
  hamstrings: pairEllipse(43, 127, 7, 18),
  calves: pairEllipse(43, 162, 5.5, 14),
};

interface BodyFigureProps {
  side: 'front' | 'back';
  selected: MuscleId;
  onSelect: (id: MuscleId) => void;
  width: number;
}

/** One body view with each muscle filled in its rank colour; the selected one is outlined. */
export function BodyFigure({ side, selected, onSelect, width }: BodyFigureProps) {
  const { colors } = useTheme();
  const map = side === 'front' ? FRONT : BACK;

  return (
    <Svg width={width} height={width * 1.9} viewBox="0 0 100 190">
      <Circle cx={50} cy={14} r={10} fill={colors.surfaceRaised} />
      <Rect x={46} y={22} width={8} height={7} fill={colors.surfaceRaised} />
      {side === 'front' ? (
        <Rect x={38} y={86} width={24} height={12} rx={6} fill={colors.surfaceRaised} />
      ) : null}
      {(Object.keys(map) as MuscleId[]).map((id) => {
        const fill = rankColors[muscles[id].rank.tier].base;
        const isSel = id === selected;
        const stroke = isSel ? colors.text : 'none';
        return (
          <G key={id} onPress={() => onSelect(id)} opacity={isSel ? 1 : 0.85}>
            {map[id]!.map((s, i) => {
              const common = { fill, stroke, strokeWidth: isSel ? 1.8 : 0 };
              if (s.kind === 'ellipse')
                return <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
              if (s.kind === 'circle')
                return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />;
              if (s.kind === 'rect')
                return (
                  <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} />
                );
              return <Polygon key={i} points={s.points} {...common} />;
            })}
          </G>
        );
      })}
    </Svg>
  );
}
