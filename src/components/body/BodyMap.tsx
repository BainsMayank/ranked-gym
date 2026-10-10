import { useMemo } from 'react';
import { View } from 'react-native';

import { muscleLabels, muscles, type Muscle } from '@/lib/exercises/taxonomy';
import { spacing } from '@/theme';

import { Text } from '../Text';
import { BodyFigure } from './BodyFigure';
import type { BodyOutline, BodySide } from './paths';
import { ZoomView } from './ZoomView';

export interface BodyMapProps<T> {
  /** A value per muscle key (a rank, a volume, a recovery %…). */
  values: Partial<Record<Muscle, T>>;
  /** Fill for a value; return undefined to draw the muscle neutral. */
  colourScale: (value: T, muscle: Muscle) => string | undefined;
  /** Front, back or both side by side. */
  side?: BodySide | 'both';
  /** Width of the whole map (both figures share it when `side` is both). */
  width: number;
  selected?: Muscle | null;
  onMusclePress?: (muscle: Muscle) => void;
  /** Cosmetic only. */
  outline?: BodyOutline;
  /** Pinch to zoom, drag to pan, double-tap to reset. */
  zoomable?: boolean;
  showNeck?: boolean;
  /** Front/Back captions over each figure. */
  showLabels?: boolean;
  /** Describes the map for screen readers (pair it with an accessible list of muscles). */
  accessibilityLabel: string;
}

/**
 * Front and back body map with one path per canonical muscle key. Reused by the Rank tab (muscle
 * ranks), exercise detail and the workout summary (muscles worked), and Home in Phase 8 (volume,
 * recovery). Colours come from `colourScale`, so each screen decides what a value means.
 */
export function BodyMap<T>({
  values,
  colourScale,
  side = 'both',
  width,
  selected,
  onMusclePress,
  outline = 'male',
  zoomable = false,
  showNeck = false,
  showLabels = false,
  accessibilityLabel,
}: BodyMapProps<T>) {
  const fills = useMemo(() => {
    const out: Partial<Record<Muscle, string>> = {};
    for (const m of muscles) {
      const v = values[m];
      if (v === undefined) continue;
      const fill = colourScale(v, m);
      if (fill) out[m] = fill;
    }
    return out;
  }, [values, colourScale]);

  const sides: BodySide[] = side === 'both' ? ['front', 'back'] : [side];
  const figureWidth = side === 'both' ? (width - spacing.md) / 2 : width;
  const content = (
    <View className="flex-row justify-center gap-md">
      {sides.map((s) => (
        <View key={s} className="items-center gap-xs">
          {showLabels ? (
            <Text variant="overline" tone="muted">
              {s === 'front' ? 'Front' : 'Back'}
            </Text>
          ) : null}
          <BodyFigure
            side={s}
            outline={outline}
            width={figureWidth}
            fills={fills}
            selected={selected}
            onMusclePress={onMusclePress}
            showNeck={showNeck}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        selected ? `${accessibilityLabel}. Selected: ${muscleLabels[selected]}` : accessibilityLabel
      }
    >
      {zoomable ? <ZoomView>{content}</ZoomView> : content}
    </View>
  );
}
