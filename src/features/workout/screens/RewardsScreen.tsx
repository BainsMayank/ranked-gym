import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components';
import { useProfile } from '@/lib/profile';
import { useWorkoutRewards } from '@/lib/ranks';
import { useSyncStatusStore } from '@/lib/sync';
import { useTheme } from '@/theme';

import { RewardsBody } from '../rewards/RewardsBody';
import { ShareMilestones } from '../rewards/ShareMilestones';

/** How long to wait for the server before saying it'll show up later. */
export const REWARDS_WAIT_MS = 10_000;

/**
 * After Save: waits for the workout to sync, then shows what the server scored (records, rank-ups
 * with a reveal, placement). Offline or slow, it says so; the rewards also show on the workout in
 * History once they arrive.
 */
export function RewardsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: profile } = useProfile();
  const online = useSyncStatusStore((s) => s.online);
  const { data: state } = useWorkoutRewards(id);
  const [slow, setSlow] = useState(false);
  const unit = profile?.units ?? 'kg';

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), REWARDS_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = state?.status === 'ready' ? state.rewards : null;
  const waiting = !ready && online && !slow && state?.status !== 'unavailable';

  return (
    <Screen
      title="Workout saved"
      edges={['top', 'bottom']}
      scroll
      footer={<Button label="Done" fullWidth onPress={() => router.dismissAll()} />}
    >
      {ready ? (
        <View className="gap-xl">
          <RewardsBody rewards={ready} unit={unit} reveal />
          <ShareMilestones rewards={ready} />
        </View>
      ) : waiting ? (
        <View className="items-center gap-md py-xxxl" accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.textMuted} />
          <Text tone="muted">Checking your records and ranks…</Text>
        </View>
      ) : (
        <View className="gap-sm rounded-lg border-t border-edge bg-surface p-lg">
          <View className="flex-row items-center gap-sm">
            <Icon name="cloud-offline-outline" size={18} tone="textMuted" />
            <Text variant="subheading">
              {online ? 'Ranks are on their way' : 'Saved on this phone'}
            </Text>
          </View>
          <Text variant="caption" tone="muted">
            {online
              ? 'Your records and rank changes will show on this workout in History in a moment.'
              : 'Records and ranks update when it syncs. You’ll see them on this workout in History.'}
          </Text>
        </View>
      )}
    </Screen>
  );
}
