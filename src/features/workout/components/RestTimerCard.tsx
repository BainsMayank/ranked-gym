import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Button, Text } from '@/components';
import { useTheme } from '@/theme';

import { formatClock, useTicker } from '../hooks/useTicker';

interface RestTimerCardProps {
  seconds: number;
  next: string;
}

const SIZE = 64;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Rest countdown between sets, with +15 s and skip. */
export function RestTimerCard({ seconds, next }: RestTimerCardProps) {
  const { colors } = useTheme();
  const [total, setTotal] = useState(seconds);
  const [skipped, setSkipped] = useState(false);
  const elapsed = useTicker(!skipped);
  const left = total - elapsed;
  if (skipped || left <= 0) return null;

  return (
    <View
      accessible
      accessibilityLabel={`Resting, ${formatClock(left)} left. Next: ${next}`}
      className="flex-row items-center gap-md rounded-lg border-t border-edge bg-surface p-lg"
    >
      <View className="items-center justify-center">
        <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.border}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - left / total)}
          />
        </Svg>
        <Text variant="label" numeric className="absolute">
          {formatClock(left)}
        </Text>
      </View>
      <View className="flex-1 gap-xxs">
        <Text variant="subheading">Resting</Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          Next: {next}
        </Text>
      </View>
      <Button
        label="+15"
        variant="secondary"
        size="sm"
        accessibilityLabel="Add 15 seconds"
        onPress={() => setTotal((t) => t + 15)}
      />
      <Button
        label="Skip"
        variant="secondary"
        size="sm"
        accessibilityLabel="Skip rest"
        onPress={() => setSkipped(true)}
      />
    </View>
  );
}
