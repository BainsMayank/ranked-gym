import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '@/lib/utils';
import { spacing, useTheme } from '@/theme';

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

/** Underlined, horizontally scrollable tab strip. Used standalone or as the bar for TopTabsNavigator. */
export function TopTabs({ tabs, activeKey, onChange, className }: TopTabsProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    const l = layouts[activeKey];
    if (!l) return;
    x.set(withTiming(l.x, { duration: 220 }));
    width.set(withTiming(l.width, { duration: 220 }));
    scrollRef.current?.scrollTo({ x: Math.max(0, l.x - 48), animated: true });
  }, [activeKey, layouts, x, width]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    width: width.get(),
  }));

  return (
    <View className={cn('border-b border-border', className)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        contentContainerClassName="px-lg"
      >
        <View className="flex-row gap-lg">
          {tabs.map((tab) => {
            const selected = tab.key === activeKey;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => onChange(tab.key)}
                onLayout={(e) => {
                  const layout = e.nativeEvent.layout;
                  setLayouts((prev) => ({ ...prev, [tab.key]: layout }));
                }}
                className="min-h-11 justify-center active:opacity-70"
              >
                <Text variant="label" tone={selected ? 'default' : 'muted'}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: spacing.lg,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.primary,
            },
            indicatorStyle,
          ]}
        />
      </ScrollView>
    </View>
  );
}
