import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import { glass, useTheme } from '@/theme';

/**
 * Background for the bottom tab bar. Content scrolls underneath it, so the blur shows real depth.
 * iOS: native blur. Android: near-opaque surface, since real blur there needs a BlurTargetView
 * around every scene and costs too much on low-end phones.
 */
export function GlassTabBarBackground() {
  const { scheme, colors } = useTheme();

  return (
    <View style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={glass.intensity}
          tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.surface, opacity: glass.fallbackOpacity },
          ]}
        />
      )}
      <View
        style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.edge }}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}
