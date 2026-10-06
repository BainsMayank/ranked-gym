import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { motion } from '@/theme';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  className?: string;
  /** Layout style for the animated wrapper (e.g. alignSelf). The Pressable itself takes `className`. */
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable with the shared spring press feedback (scale to `motion.press.scale`).
 * Under reduced motion it falls back to an opacity change. NativeWind can't style Reanimated views,
 * so the scale lives on a wrapper and `className` stays on the Pressable.
 */
export function PressableScale({
  className,
  containerStyle,
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const spring = { damping: motion.press.damping, stiffness: motion.press.stiffness };
  // Flex sizing has to live on the wrapper, which NativeWind can't style; mirror `flex-1` onto it.
  const grows = /(^|\s)flex-1(\s|$)/.test(className ?? '');

  return (
    <Animated.View style={[grows && { flex: 1 }, containerStyle, animatedStyle]}>
      <Pressable
        disabled={disabled}
        onPressIn={(e) => {
          if (!reducedMotion) scale.set(withSpring(motion.press.scale, spring));
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          if (!reducedMotion) scale.set(withSpring(1, spring));
          onPressOut?.(e);
        }}
        className={cn(reducedMotion && 'active:opacity-70', className)}
        style={style}
        {...rest}
      />
    </Animated.View>
  );
}
