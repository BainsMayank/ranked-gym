import { View } from 'react-native';

import { Card, EmptyState, Screen, Text, type IconName } from '@/components';

interface Section {
  title: string;
  icon: IconName;
  emptyTitle: string;
  description: string;
}

const SECTIONS: readonly Section[] = [
  {
    title: 'My Plan',
    icon: 'calendar-outline',
    emptyTitle: 'No plan yet',
    description:
      'Pick a goal, experience level, equipment, session length and training days, and get a multi-week plan. Coming in Phase 5.',
  },
  {
    title: 'New Workout',
    icon: 'flash-outline',
    emptyTitle: 'Start training',
    description:
      'Start an empty workout, or generate one from the muscles, time and equipment you choose. Coming in Phase 4.',
  },
  {
    title: 'Routines',
    icon: 'list-outline',
    emptyTitle: 'No routines yet',
    description:
      'Build routines like "Leg Day": set types, supersets, rep ranges, targets, RIR/RPE, rest timers and notes. Coming in Phase 3.',
  },
];

export function WorkoutScreen() {
  return (
    <Screen title="Workout" scroll>
      <View className="gap-xl">
        {SECTIONS.map((s) => (
          <View key={s.title} className="gap-sm">
            <Text variant="heading">{s.title}</Text>
            <Card padded={false}>
              <EmptyState
                icon={s.icon}
                title={s.emptyTitle}
                description={s.description}
                className="py-xl"
              />
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  );
}
