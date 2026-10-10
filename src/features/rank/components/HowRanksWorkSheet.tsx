import { ScrollView, View } from 'react-native';

import { Button, Sheet, Text } from '@/components';

/** Plain-English summary of docs/RANK_SYSTEM.md. Keep the two in step. */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'The ladder',
    body: 'Every rank sits on a Rank Score from 0 to 1000, across eight tiers from Iron to Champion. Each tier but Champion has three divisions, III up to I.',
  },
  {
    title: 'What counts',
    body: 'Free-weight and bodyweight lifts rank; machines, cables and custom exercises don’t. Warm-ups, failed and assisted sets never count. Sets that look impossible wait for review.',
  },
  {
    title: 'How a lift scores',
    body: 'Weightlifting uses your estimated 1RM from sets of 1 to 10 reps (the average of Epley and Brzycki), divided by your bodyweight on the day. Calisthenics uses clean reps or weighted sets, whichever scores better; skills use your longest hold.',
  },
  {
    title: 'Fair comparisons',
    body: 'You’re compared with lifters of your standards (men’s, women’s or the average of both), bodyweight and age. Each set uses the weigh-in closest to it, so bulking never costs you a rank.',
  },
  {
    title: 'Your best 180 days',
    body: 'A lift’s rank is your best set in the 180 days before your latest set of it. Take a break and nothing drops; after 60 days your ranks show as Inactive until you’re back.',
  },
  {
    title: 'Muscles, regions and overall',
    body: 'Muscle ranks blend the lifts that train them. Regions average their muscles, and overall weights the regions (legs, back and chest most). Rank 5 lifts across 4 body regions to place.',
  },
  {
    title: 'Records',
    body: 'Every exercise keeps records: estimated 1RM, heaviest weight, most reps at a weight, set and session volume, longest hold. Your first time is a baseline, not a PR.',
  },
  {
    title: 'Leagues',
    body: 'Weekly leagues reward effort, not strength: workouts, planned sessions, PRs, rank-ups and beating your own recent weeks earn League Points. The top 20% of each group move up on Monday, the bottom 20% move down.',
  },
];

export function HowRanksWorkSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="How ranks work">
      <ScrollView style={{ maxHeight: 520 }} contentContainerClassName="gap-lg pb-md">
        {SECTIONS.map((s) => (
          <View key={s.title} className="gap-xs">
            <Text variant="subheading">{s.title}</Text>
            <Text tone="muted">{s.body}</Text>
          </View>
        ))}
        <Button label="Got it" variant="secondary" onPress={onClose} />
      </ScrollView>
    </Sheet>
  );
}
