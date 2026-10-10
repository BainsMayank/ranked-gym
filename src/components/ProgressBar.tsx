import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
  /** Recommended interval on the same 0-1 scale as progress. */
  band?: readonly [number, number];
  /** Optional distribution: replaces the single progress fill with proportional segments. */
  segments?: readonly { value: number; tone: 'textMuted' | 'edge' | 'text' }[];
}

export function ProgressBar({
  progress,
  accessibilityLabel,
  tone = 'primary',
  rankTier,
  height = 6,
  className,
  band,
  segments,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(
      withTiming(trackWidth * clamped, { duration: reducedMotion ? 0 : motion.duration.slow }),
    );
  }, [clamped, trackWidth, width, reducedMotion]);

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
      accessibilityValue={
        segments
          ? { text: accessibilityLabel }
          : { min: 0, max: 100, now: Math.round(clamped * 100) }
      }
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      className={cn('overflow-hidden rounded-full bg-surface-raised', className)}
      style={{ height }}
    >
      {segments ? (
        <View className="flex-row" style={{ height }}>
          {segments.map((segment, index) => (
            <View
              key={index}
              style={{
                height,
                flex: Math.max(0, segment.value),
                backgroundColor: colors[segment.tone],
              }}
            />
          ))}
        </View>
      ) : (
        <Animated.View
          style={[{ height, borderRadius: height / 2, backgroundColor: fillColor }, fillStyle]}
        />
      )}
      {band ? (
        <View
          pointerEvents="none"
          className="absolute h-full"
          style={{
            left: `${Math.max(0, band[0]) * 100}%`,
            width: `${Math.max(0, Math.min(1, band[1]) - Math.max(0, band[0])) * 100}%`,
            borderColor: colors.text,
            borderWidth: 1,
          }}
        />
      ) : null}
    </View>
  );
}
