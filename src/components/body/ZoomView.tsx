import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/theme';

export interface ZoomViewProps {
  children: ReactNode;
  enabled?: boolean;
  maxScale?: number;
}

/**
 * Pinch to zoom (1×–maxScale), drag to pan while zoomed, double-tap to reset. Taps on the content
 * still go through (pans start after 8pt of movement).
 */
export function ZoomView({ children, enabled = true, maxScale = 3 }: ZoomViewProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    const to = (v: number) =>
      reduceMotion ? v : withTiming(v, { duration: motion.duration.base });
    scale.set(to(1));
    x.set(to(0));
    y.set(to(0));
    savedScale.set(1);
    savedX.set(0);
    savedY.set(0);
  };

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onUpdate((e) => {
      scale.set(Math.min(maxScale, Math.max(1, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) reset();
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .minDistance(8)
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.get() <= 1) return;
      x.set(savedX.get() + e.translationX);
      y.set(savedY.get() + e.translationY);
    })
    .onEnd(() => {
      savedX.set(x.get());
      savedY.set(y.get());
    });

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => reset());

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={{ overflow: 'hidden' }} collapsable={false}>
        <Animated.View style={style}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}
