import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, Chip, Icon, Text, type IconName } from '@/components';

import { useStartWorkout } from '../session/hooks/useStartWorkout';

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
    // The flex lives on a plain wrapper: a flex-1 card collapses inside a FlashList header.
    <View className="flex-1">
      <Card
        onPress={onPress}
        accessibilityLabel={title}
        accessibilityHint={body}
        className="gap-sm"
      >
        <Icon name={icon} size={22} tone="text" />
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" tone="muted">
          {body}
        </Text>
      </Card>
    </View>
  );
}

const PRESETS = [
  { key: 'surprise', label: 'Surprise me' },
  { key: 'full', label: 'Full body 45 min' },
  { key: 'dumbbells', label: 'Dumbbells only' },
] as const;

/** Start an empty session or generate one, plus one-tap generate presets. */
export function StartOptions() {
  const router = useRouter();
  const start = useStartWorkout();
  return (
    <View className="gap-md">
      <View className="flex-row gap-sm">
        <Option
          icon="add-circle-outline"
          title="Start empty"
          body="Log freely, add exercises as you go"
          onPress={() => start({ kind: 'empty' })}
        />
        <Option
          icon="shuffle-outline"
          title="Generate random"
          body="Pick focus, time and equipment"
          onPress={() => router.push('/workout/generate')}
        />
      </View>
      <View className="flex-row flex-wrap items-center gap-sm">
        <Text variant="label" tone="muted">
          Quick generate
        </Text>
        {PRESETS.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            onPress={() =>
              router.push({ pathname: '/workout/generate', params: { preset: p.key } })
            }
          />
        ))}
      </View>
    </View>
  );
}
