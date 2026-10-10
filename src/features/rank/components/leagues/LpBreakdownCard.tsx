import { View } from 'react-native';

import { Card, Text } from '@/components';
import type { LpBreakdown } from '@/lib/leagues';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Where this week's League Points came from, with each source's rule and cap. */
export function LpBreakdownCard({ breakdown }: { breakdown: LpBreakdown }) {
  const c = breakdown.counts;
  const rows: [string, string, number][] = [
    ['Workouts', `${plural(c.days, 'day')} · 40 a day`, breakdown.workouts],
    ['Planned sessions', `${plural(c.planned, 'session')} on plan · +15 each`, breakdown.planned],
    ['PRs', `${plural(c.prs, 'PR')} · 10 each, up to 60`, breakdown.prs],
    ['Rank-ups', `${plural(c.rankUps, 'lift')} · 30 each, up to 90`, breakdown.rankUps],
    [
      'Beat your baseline',
      c.baselineSets > 0
        ? `${c.sets} sets vs your ${c.baselineSets} a week`
        : 'Two workouts in your first week',
      breakdown.baseline,
    ],
    ['Strength gain', `+${c.scoreGain} pts on your lifts · up to 60`, breakdown.strength],
  ];
  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between">
        <Text variant="subheading">Your League Points</Text>
        <Text variant="heading" numeric>
          {breakdown.total}
        </Text>
      </View>
      {rows.map(([label, detail, value]) => (
        <View key={label} className="flex-row items-center gap-md">
          <View className="flex-1">
            <Text variant="label">{label}</Text>
            <Text variant="caption" tone="muted" numeric>
              {detail}
            </Text>
          </View>
          <Text variant="label" numeric tone={value > 0 ? 'default' : 'muted'}>
            {value > 0 ? `+${value}` : '0'}
          </Text>
        </View>
      ))}
      <Text variant="caption" tone="muted">
        LP reward effort and progress, never how much you lift, so every group is winnable.
      </Text>
    </Card>
  );
}
