import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius as radii, useTheme } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: keyof typeof radii;
  /** Margins/layout only — the fill colour comes from the theme. */
  className?: string;
}

/** Loading placeholder. Pulses unless the user has reduced motion enabled. */
export function Skeleton({ width = '100%', height = 16, radius = 'sm', className }: SkeletonProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <View className={className} style={{ width, height }}>
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          { flex: 1, borderRadius: radii[radius], backgroundColor: colors.surfaceRaised },
          style,
        ]}
      />
    </View>
  );
}
