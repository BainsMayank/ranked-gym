import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text, type TextProps } from '@/components';
import { useTheme } from '@/theme';

import { formatClock } from '../../hooks/useTicker';

interface RestRingProps {
  left: number;
  total: number;
  size: number;
  stroke: number;
  textVariant: TextProps['variant'];
}

/** Countdown ring: neutral track, orange progress (the signal colour), time in the middle. */
export function RestRing({ left, total, size, stroke, textVariant }: RestRingProps) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </Svg>
      <Text variant={textVariant} numeric className="absolute">
        {formatClock(Math.ceil(left))}
      </Text>
    </View>
  );
}
