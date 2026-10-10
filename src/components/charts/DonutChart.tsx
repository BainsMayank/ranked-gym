import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: readonly DonutSlice[];
  size?: number;
  thickness?: number;
  /** Shown in the hole (a total, a label). */
  children?: ReactNode;
  /** Required: the slices as a sentence for screen readers. */
  accessibilityLabel: string;
}

/** Donut of slices proportional to their values, with a small gap between them. */
export function DonutChart({
  slices,
  size = 132,
  thickness = 18,
  children,
  accessibilityLabel,
}: DonutChartProps) {
  const { colors } = useTheme();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  let offset = 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceRaised}
          strokeWidth={thickness}
          fill="none"
        />
        {total > 0
          ? slices.map((s) => {
              const len = (Math.max(0, s.value) / total) * circumference;
              const start = offset;
              offset += len;
              return (
                <Circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - (slices.length > 1 ? 3 : 0))} ${circumference}`}
                  strokeDashoffset={-start}
                />
              );
            })
          : null}
      </Svg>
      {children ? <View className="absolute items-center">{children}</View> : null}
    </View>
  );
}
