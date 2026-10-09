import { View } from 'react-native';

import { NumberStepper, SegmentedControl, Text } from '@/components';
import { useTrainingSettings, useUpdateTrainingSettings } from '@/lib/profile';
import { effortMetricLabels, effortMetrics, formatRest, ROUTINE_LIMITS } from '@/lib/routines';

import { profileErrorMessage } from '../../api/profileErrors';
import { PlatesSettings } from './PlatesSettings';
import { RestSoundSetting } from './RestSoundSetting';

const EFFORT_OPTIONS = effortMetrics.map((value) => ({ value, label: effortMetricLabels[value] }));

/** Effort target, default rest, rest sound, and bar and plates. Saves straight away. */
export function TrainingSettings() {
  const settings = useTrainingSettings();
  const update = useUpdateTrainingSettings();
  const pending = update.isError ? undefined : update.variables;

  return (
    <View className="gap-xl">
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Effort target
        </Text>
        <SegmentedControl
          accessibilityLabel="Effort target"
          options={EFFORT_OPTIONS}
          value={pending?.effort_metric ?? settings.effort_metric}
          onChange={(effort_metric) => update.mutate({ effort_metric })}
        />
        <Text variant="caption" tone="muted">
          RIR is reps left in the tank (0 = failure). RPE rates effort from 5 to 10. Both shows two
          columns in your routines.
        </Text>
      </View>
      <View className="gap-sm">
        <Text variant="label" tone="muted">
          Default rest between sets
        </Text>
        <NumberStepper
          label="Default rest"
          value={pending?.rest_timer_default_sec ?? settings.rest_timer_default_sec}
          onChange={(rest_timer_default_sec) => update.mutate({ rest_timer_default_sec })}
          min={0}
          max={ROUTINE_LIMITS.restMaxSec}
          step={15}
          format={formatRest}
        />
        <Text variant="caption" tone="muted">
          Used for exercises you add to a routine. Isolation exercises get a bit less.
        </Text>
      </View>
      <RestSoundSetting />
      <PlatesSettings />
      {update.isPending ? (
        <Text variant="caption" tone="muted">
          Saving. If you&apos;re offline, it saves when you&apos;re back online.
        </Text>
      ) : null}
      {update.isError ? (
        <Text variant="caption" tone="danger">
          {profileErrorMessage(update.error)}
        </Text>
      ) : null}
    </View>
  );
}
