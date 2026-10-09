import { Switch, View } from 'react-native';

import { Text } from '@/components';
import { useWorkoutPrefs } from '@/lib/workouts';
import { useTheme } from '@/theme';

/** Rest timer sound on this phone (it always vibrates). */
export function RestSoundSetting() {
  const { colors } = useTheme();
  const restSound = useWorkoutPrefs((s) => s.restSound);
  const update = useWorkoutPrefs((s) => s.update);
  return (
    <View className="flex-row items-center gap-md">
      <View className="flex-1 gap-xxs">
        <Text variant="subheading">Sound when rest ends</Text>
        <Text variant="caption" tone="muted">
          Your phone always vibrates. This setting is for this phone only.
        </Text>
      </View>
      <Switch
        value={restSound}
        onValueChange={(on) => update({ restSound: on })}
        accessibilityLabel="Sound when rest ends"
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}
