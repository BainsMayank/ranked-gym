import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { useTheme } from '@/theme';

import { invite } from '../mocks';

/** Referral code with copy/share and progress to the Founder badge. Rewards are granted server-side. */
export function InviteCard() {
  const { colors } = useTheme();
  return (
    <Card className="gap-md">
      <Text variant="overline" tone="primary">
        Invite and earn
      </Text>
      <Text variant="caption" tone="muted">
        {invite.reward}
      </Text>
      <View className="flex-row items-center gap-sm rounded-md bg-surface-raised p-sm pl-md">
        <Text variant="heading" numeric className="flex-1" selectable>
          {invite.code}
        </Text>
        <Button label="Copy" variant="outline" size="sm" onPress={() => undefined} />
        <Button label="Share" variant="accent" size="sm" onPress={() => undefined} />
      </View>
      <View className="flex-row items-center gap-sm">
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Friends joined"
          accessibilityValue={{ min: 0, max: invite.goal, now: invite.joined }}
          className="flex-1 flex-row gap-xs"
        >
          {Array.from({ length: invite.goal }, (_, i) => (
            <View
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i < invite.joined ? colors.primary : colors.surfaceRaised }}
            />
          ))}
        </View>
        <Text variant="label" numeric>
          {invite.joined} / {invite.goal} joined
        </Text>
      </View>
    </Card>
  );
}
