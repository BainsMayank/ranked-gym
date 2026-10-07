import { View } from 'react-native';

import { SegmentedControl, Text } from '@/components';
import { useProfile, useUpdateProfile } from '@/lib/profile';
import type { WeightUnit } from '@/lib/units';

import { profileErrorMessage } from '../../api/profileErrors';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg · cm' },
  { value: 'lb', label: 'lb · ft/in' },
] as const satisfies readonly { value: WeightUnit; label: string }[];

/** kg/lb switch. Saves straight away; stored values are always kg and cm. */
export function UnitsSettings() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted">
        Units
      </Text>
      <SegmentedControl
        accessibilityLabel="Units"
        options={UNIT_OPTIONS}
        value={(update.isError ? undefined : update.variables?.units) ?? profile?.units ?? 'kg'}
        onChange={(units) => update.mutate({ units })}
      />
      <Text variant="caption" tone={update.isError ? 'danger' : 'muted'}>
        {update.isError
          ? profileErrorMessage(update.error)
          : 'Your history is stored in kg and converts automatically.'}
      </Text>
    </View>
  );
}
