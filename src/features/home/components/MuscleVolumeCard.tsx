import { useState } from 'react';
import { View } from 'react-native';

import { Card, Icon, ProgressBar, SegmentedControl, Text } from '@/components';

import { muscleVolume } from '../mocks';

const RANGES = [
  { value: '7', label: '7D' },
  { value: '14', label: '14D' },
  { value: '30', label: '30D' },
] as const;

/** Hard sets per muscle against the weekly target; under-target muscles show in warning. */
export function MuscleVolumeCard() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('7');
  const under = muscleVolume.rows.filter((r) => r.sets < muscleVolume.targetMin);

  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between gap-md">
        <Text variant="subheading">Muscle analysis</Text>
        <SegmentedControl
          accessibilityLabel="Time range"
          options={RANGES}
          value={range}
          onChange={setRange}
          className="w-36"
        />
      </View>
      <Text variant="caption" tone="muted">
        Hard sets per muscle this week · target {muscleVolume.targetMin}–{muscleVolume.targetMax}
      </Text>
      <View className="gap-sm">
        {muscleVolume.rows.map((r) => (
          <View key={r.muscle} className="flex-row items-center gap-md">
            <Text variant="label" className="w-24">
              {r.muscle}
            </Text>
            <ProgressBar
              progress={r.sets / muscleVolume.targetMax}
              tone={r.sets < muscleVolume.targetMin ? 'warning' : 'neutral'}
              accessibilityLabel={`${r.muscle}: ${r.sets} sets`}
              className="flex-1"
            />
            <Text variant="label" numeric className="w-6 text-right">
              {r.sets}
            </Text>
          </View>
        ))}
      </View>
      {under.map((r) => (
        <View key={r.muscle} className="flex-row items-center gap-xs">
          <Icon name="alert-circle-outline" size={16} tone="warning" />
          <Text variant="label" tone="warning">
            {r.muscle} under target · add {muscleVolume.targetMin - r.sets} sets
          </Text>
        </View>
      ))}
    </Card>
  );
}
