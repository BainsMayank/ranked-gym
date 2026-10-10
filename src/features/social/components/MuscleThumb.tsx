import { memo, useMemo } from 'react';

import { BodyMap } from '@/components';
import { muscleLabels, type Muscle } from '@/lib/exercises/taxonomy';
import { useTheme } from '@/theme';

/** A small front view of the muscles a workout trained (the most-trained in orange). */
export const MuscleThumb = memo(function MuscleThumb({
  muscles,
  width = 72,
}: {
  muscles: readonly { muscle: Muscle; sets: number }[];
  width?: number;
}) {
  const { colors } = useTheme();
  const max = Math.max(0, ...muscles.map((m) => m.sets));
  const values = useMemo(() => {
    const out: Partial<Record<Muscle, number>> = {};
    for (const m of muscles) out[m.muscle] = m.sets;
    return out;
  }, [muscles]);
  if (muscles.length === 0) return null;
  return (
    <BodyMap<number>
      values={values}
      side="front"
      width={width}
      colourScale={(sets) => (sets >= max * 0.6 ? colors.primary : colors.textMuted)}
      accessibilityLabel={`Muscles trained: ${muscles
        .slice(0, 4)
        .map((m) => muscleLabels[m.muscle])
        .join(', ')}`}
    />
  );
});
