import { View } from 'react-native';

import { Screen } from '@/components';

import { MediaPostCard } from '../components/MediaPostCard';
import { StoryRow } from '../components/StoryRow';
import { StreakActivityCard } from '../components/StreakActivityCard';
import { WorkoutPostCard } from '../components/WorkoutPostCard';
import { feed } from '../mocks';

/** Home → Feed: friends' recent training, then posts, media and milestones. */
export function FeedScreen() {
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <StoryRow />
        {feed.map((item) => {
          if (item.kind === 'workout') return <WorkoutPostCard key={item.id} post={item} />;
          if (item.kind === 'media') return <MediaPostCard key={item.id} post={item} />;
          return <StreakActivityCard key={item.id} author={item.author} days={item.days} />;
        })}
      </View>
    </Screen>
  );
}
