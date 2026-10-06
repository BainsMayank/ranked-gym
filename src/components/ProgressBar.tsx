import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { motion, rankColors, useTheme, type RankTier } from '@/theme';

export type ProgressTone = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  /** 0 → 1. Values outside are clamped. */
  progress: number;
  accessibilityLabel: string;
  tone?: ProgressTone;
  /** Uses the rank colour instead of a semantic tone. */
  rankTier?: RankTier;
  height?: number;
  className?: string;
}

export function ProgressBar({
  progress,
  accessibilityLabel,
  tone = 'primary',
  rankTier,
  height = 6,
  className,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(withTiming(trackWidth * clamped, { duration: motion.duration.slow }));
  }, [clamped, trackWidth, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: width.get() }));
  const fillColor = rankTier
    ? rankColors[rankTier].base
    : tone === 'neutral'
      ? colors.textMuted
      : colors[tone];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      className={cn('overflow-hidden rounded-full bg-surface-raised', className)}
      style={{ height }}
    >
      <Animated.View
        style={[{ height, borderRadius: height / 2, backgroundColor: fillColor }, fillStyle]}
      />
    </View>
  );
}
