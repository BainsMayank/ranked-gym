import { View } from 'react-native';

import { Card, Tag, Text } from '@/components';
import type { LiftSet } from '@/lib/ranks';
import { formatWeight, type WeightUnit } from '@/lib/units';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function setLine(s: LiftSet, unit: WeightUnit): string {
  if (s.durationSec) return `${s.durationSec} s hold`;
  const load = s.weightKg && s.weightKg > 0 ? `${formatWeight(s.weightKg, unit, 0.5)} × ` : '';
  const e1rm = s.e1rm ? ` · e1RM ${formatWeight(s.e1rm, unit, 0.5)}` : '';
  return `${load}${s.reps ?? 0}${load ? '' : ' reps'}${e1rm}`;
}

/** The sets in the 180-day window, best first, with the score each earned. */
export function LiftSetsCard({ sets, unit }: { sets: readonly LiftSet[]; unit: WeightUnit }) {
  const shown = sets.slice(0, 10);
  return (
    <Card className="gap-md">
      <View className="gap-xxs">
        <Text variant="subheading">Sets that counted</Text>
        <Text variant="caption" tone="muted">
          Your rank is your best set in the 180 days before your latest one.
        </Text>
      </View>
      {shown.length === 0 ? <Text tone="muted">No ranked sets yet.</Text> : null}
      {shown.map((s) => (
        <View key={s.setId} className="flex-row items-center gap-md border-b border-border pb-sm">
          <View className="flex-1 gap-xxs">
            <Text numeric>{setLine(s, unit)}</Text>
            <Text variant="caption" tone="muted">
              {s.exerciseName} · {s.workoutName} · {DATE.format(new Date(s.at))}
            </Text>
          </View>
          {s.isBest ? <Tag label="Best" tone="primary" /> : null}
          <Text variant="label" numeric tone="muted">
            {s.score !== null ? `${Math.round(s.score)} pts` : '—'}
          </Text>
        </View>
      ))}
      {sets.length > shown.length ? (
        <Text variant="caption" tone="muted">
          and {sets.length - shown.length} more in the window
        </Text>
      ) : null}
    </Card>
  );
}
