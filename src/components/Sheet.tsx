import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { radius, spacing, useTheme } from '@/theme';

import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
const SPRING = { damping: 22, stiffness: 220 };

/** Bottom sheet: slides up over a scrim, closes on scrim tap, back button, or drag down. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(screenHeight);

  // Mount immediately when opened; unmount only after the close animation finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.set(withSpring(0, SPRING));
    } else {
      translateY.set(
        withTiming(screenHeight, { duration: 220 }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, screenHeight, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withSpring(0, SPRING));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, screenHeight], [0.6, 0]),
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}
        >
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>
        {/* Sheets with inputs (rename, notes) rise above the keyboard instead of hiding under it. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.dock}
          pointerEvents="box-none"
        >
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: screenHeight * 0.9,
              },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View className="items-center gap-md pb-sm pt-md">
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  className="h-1 w-10 rounded-full bg-border"
                />
                {title ? <Text variant="heading">{title}</Text> : null}
              </View>
            </GestureDetector>
            <View className="px-lg">{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
});
