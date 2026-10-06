import type { ReactNode } from 'react';
import { View } from 'react-native';
import TopTabsLayout from 'expo-router/js-top-tabs';
import type { ParamListBase, TabNavigationState } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Text } from '../Text';
import { TopTabs } from '../TopTabs';

export interface TopTabScreen {
  /** Route file name inside the layout's folder, e.g. "index" or "body-map". */
  name: string;
  title: string;
}

interface TopTabsNavigatorProps {
  /** Large title above the tab strip, e.g. "Rank". */
  title: string;
  screens: readonly TopTabScreen[];
  headerRight?: ReactNode;
}

/** Minimal shape of the props the material-top-tabs navigator passes to `tabBar` (its own type is `any`). */
interface TabBarProps {
  state: TabNavigationState<ParamListBase>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

/** Swipeable top sub-tabs (Expo Router routes) with our TopTabs strip as the bar. */
export function TopTabsNavigator({ title, screens, headerRight }: TopTabsNavigatorProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const titles = Object.fromEntries(screens.map((s) => [s.name, s.title]));

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="min-h-12 flex-row items-center justify-between px-lg pb-md pt-sm">
        <Text variant="title">{title}</Text>
        {headerRight}
      </View>
      <TopTabsLayout
        initialRouteName={screens[0]?.name}
        screenOptions={{ lazy: true, sceneStyle: { backgroundColor: colors.background } }}
        tabBar={({ state, navigation }: TabBarProps) => {
          const active = state.routes[state.index];
          return (
            <TopTabs
              className="mx-lg mb-sm"
              tabs={state.routes.map((r) => ({ key: r.key, label: titles[r.name] ?? r.name }))}
              activeKey={active?.key ?? ''}
              onChange={(key) => {
                const route = state.routes.find((r) => r.key === key);
                if (!route) return;
                const event = navigation.emit({
                  type: 'tabPress',
                  target: key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented && route.key !== active?.key)
                  navigation.navigate(route.name);
              }}
            />
          );
        }}
      >
        {screens.map((s) => (
          <TopTabsLayout.Screen key={s.name} name={s.name} options={{ title: s.title }} />
        ))}
      </TopTabsLayout>
    </View>
  );
}
