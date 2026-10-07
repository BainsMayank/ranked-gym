import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, RankBadge, RankGlow, Screen, Text } from '@/components';
import { useProfile } from '@/lib/profile';

/** End of onboarding: a short welcome, then straight into a plan or a first workout. */
export function ReadyScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const firstName = profile?.display_name?.split(' ')[0];

  // Land on the Workout tab first so Back from the plan or session returns somewhere sensible.
  const openFromWorkout = (href: '/plan/new' | '/session') => {
    router.replace('/workout');
    router.push(href);
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View className="gap-sm">
          <Button
            label="Create my plan"
            fullWidth
            size="lg"
            onPress={() => openFromWorkout('/plan/new')}
          />
          <Button
            label="Start a workout"
            variant="outline"
            fullWidth
            size="lg"
            onPress={() => openFromWorkout('/session')}
          />
          <Button
            label="Look around first"
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/home')}
          />
        </View>
      }
    >
      <View className="flex-1 items-center justify-center gap-xl">
        <View className="relative -mx-lg h-64 items-center justify-center self-stretch">
          <RankGlow tier="iron" intensity={0.35} />
          <RankBadge tier="iron" division={4} size={128} />
        </View>
        <View className="items-center gap-sm">
          <Text variant="display" className="text-center" accessibilityRole="header">
            {firstName ? `You're in, ${firstName}.` : "You're in."}
          </Text>
          <Text tone="muted" className="text-center">
            Everyone starts at Iron. Log your first lifts and your real rank shows up straight away.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
