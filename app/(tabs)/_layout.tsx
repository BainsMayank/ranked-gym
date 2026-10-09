import { BottomTabBar, Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components';
import { GlassTabBarBackground } from '@/components/navigation/GlassTabBarBackground';
import { MiniBar } from '@/features/workout/session/components/MiniBar';
import { useActiveSessionBoot } from '@/features/workout/session/hooks/useActiveSessionBoot';
import { useExerciseLibrarySync } from '@/lib/exercises';
import { usePlanSync } from '@/lib/plans';
import { useLatestBodyweight } from '@/lib/profile';
import { useRoutineSync } from '@/lib/routines';
import { useSyncEngine } from '@/lib/sync';
import { useWorkoutSync } from '@/lib/workouts';
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
  // Mirrors the exercise library into SQLite once signed in, so search works offline.
  useExerciseLibrarySync();
  // Pushes routine changes made offline and pulls ones made on other devices.
  useRoutineSync();
  // Finished workouts from other devices; pushes logged ones.
  useWorkoutSync();
  // Plans made or edited offline, and plans from other devices.
  usePlanSync();
  // Retries the outbox on foreground and as soon as the connection comes back.
  useSyncEngine();
  // Restores a workout in progress after a kill and ends rests on time.
  useActiveSessionBoot();
  // Caches the latest weigh-in, so workouts started offline still get a bodyweight (calories).
  useLatestBodyweight();

  return (
    <Tabs
      // The workout mini bar docks above the tab bar; both float over the content (glass).
      tabBar={(props) => (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <MiniBar />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // The wrapper above is absolute so screens scroll under the glass; Screen pads by the height.
        tabBarStyle: {
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
