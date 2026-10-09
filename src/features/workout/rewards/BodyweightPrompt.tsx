import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Icon, Text } from '@/components';

/** Weighted lifts need a weigh-in within 30 days to rank; the sets still count once one exists. */
export function BodyweightPrompt() {
  const router = useRouter();
  return (
    <View className="gap-md rounded-lg border-t border-edge bg-surface p-lg">
      <View className="flex-row items-center gap-sm">
        <Icon name="scale-outline" size={18} tone="warning" />
        <Text variant="subheading">Add a weigh-in to rank these lifts</Text>
      </View>
      <Text variant="caption" tone="muted">
        Ranks compare you with lifters of your bodyweight, so weighted lifts need a weigh-in from
        the last 30 days. Today’s sets will rank as soon as you add one.
      </Text>
      <Button
        label="Add weigh-in"
        variant="secondary"
        onPress={() => router.push('/profile/edit')}
      />
    </View>
  );
}
