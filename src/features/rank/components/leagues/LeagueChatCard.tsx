import { View } from 'react-native';

import { Card, Icon, Text } from '@/components';

/** Placeholder: league chat arrives with comments (Phase 9). */
export function LeagueChatCard() {
  return (
    <Card className="flex-row items-center gap-md">
      <Icon name="chatbubbles-outline" tone="textMuted" />
      <View className="flex-1">
        <Text variant="label">League chat</Text>
        <Text variant="caption" tone="muted">
          Banter with your group opens with comments, coming soon.
        </Text>
      </View>
    </Card>
  );
}
