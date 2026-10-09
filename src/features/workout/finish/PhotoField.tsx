import { Image, View } from 'react-native';

import { Button, Text } from '@/components';
import { deleteLocalPhoto, pickWorkoutPhoto } from '@/lib/workouts';

/** Optional photo: pick one from the library, see it, swap or remove it. */
export function PhotoField({
  workoutId,
  uri,
  onChange,
}: {
  workoutId: string;
  uri: string | null;
  onChange: (uri: string | null) => void;
}) {
  const pick = async () => {
    const next = await pickWorkoutPhoto(workoutId);
    if (!next) return;
    deleteLocalPhoto(uri);
    onChange(next);
  };

  if (!uri) {
    return (
      <View className="gap-xs">
        <Button
          label="Add a photo"
          icon="image-outline"
          variant="outline"
          onPress={() => void pick()}
        />
        <Text variant="caption" tone="muted">
          Optional. It uploads with the workout when you&apos;re online.
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-md">
      <Image
        source={{ uri }}
        accessibilityLabel="Workout photo"
        className="h-24 w-20 rounded-md bg-surface-raised"
      />
      <View className="flex-1 gap-sm">
        <Button label="Change photo" variant="secondary" size="sm" onPress={() => void pick()} />
        <Button
          label="Remove"
          variant="ghost"
          size="sm"
          onPress={() => {
            deleteLocalPhoto(uri);
            onChange(null);
          }}
        />
      </View>
    </View>
  );
}
