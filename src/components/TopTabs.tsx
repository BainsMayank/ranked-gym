import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { radius, useTheme } from '@/theme';

import { Text } from './Text';

export interface TopTabItem {
  key: string;
  label: string;
}

export interface TopTabsProps {
  tabs: readonly TopTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

const PAD = 3;

/**
 * Segmented sub-tab bar: equal-width segments with a sliding inverted pill (white on dark).
 * Used standalone or as the bar for TopTabsNavigator.
 */
export function TopTabs({ tabs, activeKey, onChange, className }: TopTabsProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeKey),
  );
  const segment = tabs.length > 0 ? (width - PAD * 2) / tabs.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const target = index * segment;
    x.set(reducedMotion ? target : withSpring(target, { damping: 22, stiffness: 260 }));
  }, [index, segment, reducedMotion, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={cn('flex-row rounded-md bg-surface', className)}
      style={{ padding: PAD }}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: segment,
              borderRadius: radius.md - PAD,
              backgroundColor: colors.text,
            },
            pillStyle,
          ]}
        />
      ) : null}
      {tabs.map((tab) => {
        const selected = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            className="min-h-10 flex-1 items-center justify-center px-xs"
          >
            <Text
              variant="label"
              tone={selected ? 'inverse' : 'muted'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
