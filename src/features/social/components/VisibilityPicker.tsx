import { View } from 'react-native';

import { SegmentedControl, Text } from '@/components';
import type { Visibility } from '@/lib/social';
import { visibilityLabels, workoutVisibilities } from '@/lib/workouts/taxonomy';

const OPTIONS = workoutVisibilities.map((v) => ({ value: v, label: visibilityLabels[v] }));

const rank = { private: 0, friends: 1, public: 2 } as const;

/** Who sees a post. A friends-only or private profile caps it, and the note says so. */
export function VisibilityPicker({
  value,
  profileVisibility,
  onChange,
}: {
  value: Visibility;
  profileVisibility: Visibility;
  onChange: (v: Visibility) => void;
}) {
  const capped = rank[profileVisibility] < rank[value];
  return (
    <View className="gap-xs">
      <SegmentedControl
        options={OPTIONS}
        value={value}
        onChange={onChange}
        accessibilityLabel="Who can see this post"
      />
      <Text variant="caption" tone="muted">
        {capped
          ? `Your profile is ${profileVisibility === 'private' ? 'private' : 'friends only'}, so only ${
              profileVisibility === 'private' ? 'you' : 'friends'
            } will see it.`
          : value === 'public'
            ? 'Anyone on Ranked Gym can see it, including in Discover.'
            : value === 'friends'
              ? 'Only your friends can see it.'
              : 'Only you can see it.'}
      </Text>
    </View>
  );
}
