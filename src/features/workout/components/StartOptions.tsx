import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Chip, Icon, Text, type IconName } from '@/components';

import { quickGenerate } from '../mocks';

function Option({
  icon,
  title,
  body,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={body}
      className="flex-1 gap-sm"
    >
      <Icon name={icon} size={22} tone="text" />
      <Text variant="subheading">{title}</Text>
      <Text variant="caption" tone="muted">
        {body}
      </Text>
    </Card>
  );
}

/** Start an empty session or generate one, plus one-tap generate presets. */
export function StartOptions() {
  const router = useRouter();
  return (
    <View className="gap-md">
      <View className="flex-row gap-sm">
        <Option
          icon="add-circle-outline"
          title="Start empty"
          body="Log freely, add exercises as you go"
          onPress={() => router.push('/session')}
        />
        <Option
          icon="shuffle-outline"
          title="Generate random"
          body="Pick focus, time and equipment"
          onPress={() => undefined}
        />
      </View>
      <View className="flex-row flex-wrap items-center gap-sm">
        <Text variant="label" tone="muted">
          Quick generate
        </Text>
        {quickGenerate.map((q) => (
          <Chip key={q} label={q} onPress={() => undefined} />
        ))}
      </View>
    </View>
  );
}
