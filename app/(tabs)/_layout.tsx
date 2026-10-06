import { Tabs } from 'expo-router/js-tabs';

import { Icon, type IconName } from '@/components';
import { GlassTabBarBackground } from '@/components/navigation/GlassTabBarBackground';
import { fontFamilies, useTheme } from '@/theme';

const TABS: readonly { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'rank', title: 'Rank', icon: 'shield-outline', iconActive: 'shield' },
  { name: 'friends', title: 'Friends', icon: 'people-outline', iconActive: 'people' },
  { name: 'profile', title: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Absolute so screens scroll under the glass; Screen pads its content by the tab bar height.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarLabelStyle: { fontFamily: fontFamilies.medium, fontSize: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: `${t.title} tab`,
            tabBarIcon: ({ focused, color, size }) => (
              <Icon name={focused ? t.iconActive : t.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
