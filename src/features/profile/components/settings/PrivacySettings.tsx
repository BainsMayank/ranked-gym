import { View } from 'react-native';

import { Text } from '@/components';
import { useProfile, useUpdateProfile, visibilityOptions } from '@/lib/profile';
import { useMilestoneMode, useSetMilestoneMode, type MilestonePostMode } from '@/lib/social';

import { profileErrorMessage } from '../../api/profileErrors';
import { ChoiceList } from '../fields/ChoiceList';

const milestoneOptions = [
  {
    id: 'ask',
    title: 'Ask me',
    subtitle: 'After a workout, offer to share a new record or rank-up.',
  },
  {
    id: 'auto',
    title: 'Automatically',
    subtitle: 'Post your best record and biggest rank-up from each workout.',
  },
  { id: 'never', title: 'Never', subtitle: 'Records, rank-ups and goals stay off the feed.' },
] as const satisfies readonly { id: MilestonePostMode; title: string; subtitle: string }[];

/** Profile visibility and milestone sharing. Both save straight away. */
export function PrivacySettings() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const mode = useMilestoneMode();
  const setMode = useSetMilestoneMode();
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
      <Text variant="label" tone="muted" className="pt-lg">
        Share milestones
      </Text>
      <ChoiceList
        label="Share milestones"
        options={milestoneOptions}
        value={(setMode.isError ? undefined : setMode.variables) ?? mode.data}
        onChange={(m) => setMode.mutate(m)}
      />
      <Text variant="caption" tone={setMode.isError ? 'danger' : 'muted'}>
        {setMode.isError
          ? 'That didn’t save. Check your connection and try again.'
          : 'Milestone posts use your profile visibility. You can edit or delete any post later.'}
      </Text>
    </View>
  );
}
