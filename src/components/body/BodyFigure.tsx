import { memo, useId } from 'react';
import Svg, { ClipPath, Defs, Path } from 'react-native-svg';

import type { Muscle } from '@/lib/exercises/taxonomy';
import { useTheme } from '@/theme';

import { ASPECT_RATIO, BODY_PATHS, VIEW_BOXES, type BodyOutline, type BodySide } from './paths';

export interface BodyFigureProps {
  side: BodySide;
  outline: BodyOutline;
  width: number;
  fills: Partial<Record<Muscle, string>>;
  selected?: Muscle | null;
  onMusclePress?: (muscle: Muscle) => void;
  showNeck?: boolean;
}

/** Licensed anatomy. Independent male/female contours, no stretched or mirrored silhouettes. */
export const BodyFigure = memo(function BodyFigure({
  side,
  outline,
  width,
  fills,
  selected,
  onMusclePress,
  showNeck = false,
}: BodyFigureProps) {
  const { colors } = useTheme();
  const id = useId().replace(/:/g, '');
  const paths = BODY_PATHS[outline][side];
  return (
    <Svg
      width={width}
      height={width * ASPECT_RATIO[outline][side]}
      viewBox={VIEW_BOXES[outline][side]}
    >
      <Defs>
        {paths.map((p, i) =>
          p.clip ? (
            <ClipPath key={i} id={`${id}-${i}`}>
              <Path d={p.clip} />
            </ClipPath>
          ) : null,
        )}
      </Defs>
      {paths.map(({ muscle, d, clip, source }, i) => {
        const activeMuscle = muscle === 'neck' && !showNeck ? undefined : muscle;
        const isSelected = !!activeMuscle && selected === activeMuscle;
        return (
          <Path
            key={`${source}-${muscle}`}
            id={activeMuscle ? `${id}-${activeMuscle}-${i}` : undefined}
            testID={activeMuscle ? `muscle-${activeMuscle}` : undefined}
            d={d}
            clipPath={clip ? `url(#${id}-${i})` : undefined}
            fill={activeMuscle ? (fills[activeMuscle] ?? colors.border) : colors.surfaceRaised}
            stroke={isSelected ? colors.text : colors.surface}
            strokeWidth={isSelected ? 5 : 1.5}
            strokeLinejoin="round"
            onPress={activeMuscle && onMusclePress ? () => onMusclePress(activeMuscle) : undefined}
          />
        );
      })}
    </Svg>
  );
});
