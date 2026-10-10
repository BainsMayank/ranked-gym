import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { BodyMap, ListGroup, ListItem, Text } from '@/components';
import { muscleLabels, type Muscle } from '@/lib/exercises';
import { formatSetCount, type MuscleSets } from '@/lib/routines';
import { useTheme } from '@/theme';

/** Muscles trained, by weighted working sets: the body map (most-trained in orange) and a list. */
export function MusclesWorked({ muscles }: { muscles: MuscleSets[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(0, ...muscles.map((m) => m.sets));
  const values = useMemo(() => {
    const out: Partial<Record<Muscle, number>> = {};
    for (const m of muscles) out[m.muscle] = m.sets;
    return out;
  }, [muscles]);

  if (muscles.length === 0) {
    return (
      <Text variant="caption" tone="muted">
        Tick a working set to see the muscles it trained.
      </Text>
    );
  }
  return (
    <View className="gap-md" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <BodyMap<number>
          values={values}
          colourScale={(sets) => (sets >= max * 0.6 ? colors.primary : colors.textMuted)}
          width={Math.min(320, width)}
          accessibilityLabel={`Muscles trained: ${muscles
            .slice(0, 5)
            .map((m) => muscleLabels[m.muscle])
            .join(', ')}`}
        />
      ) : null}
      <ListGroup>
        {muscles.slice(0, 8).map((m) => (
          <ListItem key={m.muscle} title={muscleLabels[m.muscle]} value={formatSetCount(m.sets)} />
        ))}
      </ListGroup>
    </View>
  );
}
