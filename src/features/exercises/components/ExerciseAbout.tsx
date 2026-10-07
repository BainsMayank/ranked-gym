import { View } from 'react-native';

import type { Exercise } from '@/lib/exercises';

import { MusclesCard } from './MusclesCard';
import { TextList } from './TextList';

export function ExerciseAbout({ exercise }: { exercise: Exercise }) {
  return (
    <View className="gap-xl">
      <MusclesCard exercise={exercise} />
      <TextList title="How to do it" items={exercise.instructions} numbered />
      <TextList title="Tips" items={exercise.tips} />
      <TextList title="Common mistakes" items={exercise.commonMistakes} />
    </View>
  );
}
