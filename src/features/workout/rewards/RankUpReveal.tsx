import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { RankBadge, RankGlow, RankTag, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { rankLabel } from '@/lib/game/ranks';
import { changeName, type RankChange } from '@/lib/ranks';
import { motion } from '@/theme';

interface RankUpRevealProps {
  change: RankChange;
}

const BADGE = 136;

/**
 * The one big moment on the summary: the badge springs in over a tier-coloured glow, with a
 * success haptic. Under reduced motion it simply fades in.
 */
export function RankUpReveal({ change }: RankUpRevealProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.4);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);
  const caption = useSharedValue(0);

  useEffect(() => {
    haptics.success();
    const fade = { duration: motion.duration.slow, easing: Easing.out(Easing.cubic) };
    opacity.set(withTiming(1, fade));
    caption.set(withDelay(reducedMotion ? 0 : motion.duration.base, withTiming(1, fade)));
    if (reducedMotion) {
      glow.set(withTiming(1, fade));
      return;
    }
    scale.set(
      withSequence(
        withSpring(1.12, { damping: 9, stiffness: 180 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      ),
    );
    glow.set(withSequence(withTiming(1.4, fade), withTiming(1, { duration: 900 })));
  }, [caption, glow, opacity, reducedMotion, scale]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, glow.get()) }));
  const captionStyle = useAnimatedStyle(() => ({ opacity: caption.get() }));

  const { tier, division } = change.to;
  const name = changeName(change);
  const headline = change.kind === 'placed' ? `${name} placed` : `${name} ranked up`;
  const from = change.from ? rankLabel(change.from.tier, change.from.division) : null;

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${headline}: ${rankLabel(tier, division)}${from ? `, up from ${from}` : ''}`}
      className="relative -mx-lg items-center gap-md py-xl"
    >
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, glowStyle]}>
        <RankGlow tier={tier} intensity={0.5} />
      </Animated.View>
      <Animated.View style={badgeStyle}>
        <RankBadge tier={tier} division={division} size={BADGE} />
      </Animated.View>
      <Animated.View style={captionStyle} className="items-center gap-xxs">
        <Text variant="overline" tone="muted">
          {headline}
        </Text>
        <RankTag tier={tier} division={division} size="md" />
        {from ? (
          <Text variant="caption" tone="muted">
            Up from {from}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}
