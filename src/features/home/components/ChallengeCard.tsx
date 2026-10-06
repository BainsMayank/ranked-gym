import { View } from 'react-native';

import { Button, Card, Text } from '@/components';

interface ChallengeCardProps {
  title: string;
  status: string;
  meta: string;
}

/** An open challenge to join: the screen's game moment, so its action is the orange accent. */
export function ChallengeCard({ title, status, meta }: ChallengeCardProps) {
  return (
    <Card className="gap-md">
      <View className="flex-row items-start justify-between gap-md">
        <Text variant="subheading" className="flex-1">
          {title}
        </Text>
        <Text variant="label" tone="primary">
          {status}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {meta}
      </Text>
      <Button label="Join challenge" variant="accent" fullWidth onPress={() => undefined} />
    </Card>
  );
}
