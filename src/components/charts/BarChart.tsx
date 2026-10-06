import { View } from 'react-native';

import { cn } from '@/lib/utils';
import { useTheme } from '@/theme';

import { Text } from '../Text';

export interface BarDatum {
  value: number;
  label?: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  /** Bar drawn in the signal colour; the rest are muted. Defaults to the last bar. */
  highlightIndex?: number;
  height?: number;
  showValues?: boolean;
  accessibilityLabel: string;
  className?: string;
}

/**
 * Simple vertical bars built from Views. Enough for layout and small trends; richer charts move to
 * Victory Native in Phase 7.
 */
export function BarChart({
  data,
  highlightIndex = data.length - 1,
  height = 96,
  showValues = false,
  accessibilityLabel,
  className,
}: BarChartProps) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      className={cn('gap-xs', className)}
    >
      <View
        className="flex-row items-end gap-xs"
        style={{ height: height + (showValues ? 18 : 0) }}
      >
        {data.map((d, i) => (
          <View key={i} className="flex-1 items-center justify-end gap-xxs">
            {showValues ? (
              <Text variant="caption" tone="muted" numeric>
                {d.value}
              </Text>
            ) : null}
            <View
              className="w-full rounded-sm"
              style={{
                height: Math.max(3, (d.value / max) * height),
                backgroundColor: i === highlightIndex ? colors.primary : colors.edge,
              }}
            />
          </View>
        ))}
      </View>
      {data.some((d) => d.label) ? (
        <View className="flex-row gap-xs">
          {data.map((d, i) => (
            <Text key={i} variant="caption" tone="muted" className="flex-1 text-center">
              {d.label ?? ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
