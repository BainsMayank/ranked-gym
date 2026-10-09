import { View } from 'react-native';

import { Text } from '@/components';

interface PlateDiagramProps {
  /** One side, heaviest first (display unit). */
  plates: number[];
  /** Heaviest plate size, so heights are relative to it. */
  heaviest: number;
}

/**
 * One side of the bar, drawn from the collar outward: taller plates for heavier ones, each labelled.
 * Neutral surfaces only (plates aren't game objects).
 */
export function PlateDiagram({ plates, heaviest }: PlateDiagramProps) {
  return (
    <View
      className="h-40 flex-row items-center"
      accessibilityRole="image"
      accessibilityLabel={plates.length ? `Each side: ${plates.join(', ')}` : 'Empty bar'}
    >
      <View className="h-3 w-10 rounded-sm bg-border" />
      <View className="h-6 w-2 rounded-sm bg-text-muted" />
      {plates.map((p, i) => {
        const height = 48 + 104 * Math.sqrt(p / Math.max(heaviest, p));
        return (
          <View
            key={`${p}-${i}`}
            className="ml-0.5 w-7 items-center justify-center rounded-sm border-t border-edge bg-surface-raised"
            style={{ height }}
          >
            <Text
              variant="caption"
              numeric
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
              style={{ transform: [{ rotate: '-90deg' }], width: height - 8, textAlign: 'center' }}
            >
              {p}
            </Text>
          </View>
        );
      })}
      <View className="h-3 flex-1 rounded-sm bg-border" />
    </View>
  );
}
