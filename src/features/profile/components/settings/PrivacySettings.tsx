import { View } from 'react-native';

import { Text } from '@/components';
import { useProfile, useUpdateProfile, visibilityOptions } from '@/lib/profile';

import { profileErrorMessage } from '../../api/profileErrors';
import { ChoiceList } from '../fields/ChoiceList';

/** Profile visibility. Saves straight away. */
export function PrivacySettings() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  return (
    <View className="gap-sm">
      <Text variant="label" tone="muted">
        Who can see your profile
      </Text>
      <ChoiceList
        label="Profile visibility"
        options={visibilityOptions}
        value={(update.isError ? undefined : update.variables?.visibility) ?? profile?.visibility}
        onChange={(visibility) => update.mutate({ visibility })}
      />
      <Text variant="caption" tone={update.isError ? 'danger' : 'muted'}>
        {update.isError
          ? profileErrorMessage(update.error)
          : 'Your birth year, height, bodyweight and strength standards are never shown to anyone.'}
      </Text>
    </View>
  );
}
