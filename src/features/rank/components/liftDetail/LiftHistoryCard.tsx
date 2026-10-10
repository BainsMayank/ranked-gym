import { Card, LineChart, Text } from '@/components';
import type { LiftDetail } from '@/lib/ranks';
import { fromKg, type WeightUnit } from '@/lib/units';
import { rankColors, useTheme } from '@/theme';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** Best result per session, all time: e1RM for barbell lifts, reps or hold seconds otherwise. */
export function LiftHistoryCard({ detail, unit }: { detail: LiftDetail; unit: WeightUnit }) {
  const { colors } = useTheme();
  const withE1rm = detail.sessions.filter((s) => s.e1rm !== null);
  const withReps = detail.sessions.filter((s) => s.reps !== null);
  const withHold = detail.sessions.filter((s) => s.seconds !== null);
  const [metric, points] = withE1rm.length
    ? ([
        'e1RM',
        withE1rm.map((s) => ({ x: Date.parse(s.at), y: fromKg(s.e1rm ?? 0, unit) })),
      ] as const)
    : withReps.length
      ? (['reps', withReps.map((s) => ({ x: Date.parse(s.at), y: s.reps ?? 0 }))] as const)
      : (['seconds', withHold.map((s) => ({ x: Date.parse(s.at), y: s.seconds ?? 0 }))] as const);
  const label =
    metric === 'e1RM'
      ? `Estimated 1RM (${unit})`
      : metric === 'reps'
        ? 'Best set (reps)'
        : 'Longest hold (s)';
  const first = points[0]?.y;
  const last = points.at(-1)?.y;

  return (
    <Card className="gap-md">
      <Text variant="subheading">{label}</Text>
      {points.length > 1 ? (
        <LineChart
          data={points}
          color={detail.rank ? rankColors[detail.rank.rank.tier].base : colors.primary}
          formatX={(x) => DATE.format(new Date(x))}
          accessibilityLabel={`${label} over ${points.length} sessions, from ${first} to ${last}`}
        />
      ) : (
        <Text tone="muted">Log this lift twice to see your trend.</Text>
      )}
      {points.length > 1 && first !== undefined && last !== undefined ? (
        <Text variant="caption" tone="muted" numeric>
          {points.length} sessions · {last >= first ? '+' : ''}
          {Math.round((last - first) * 10) / 10} {metric === 'e1RM' ? unit : metric} since your
          first
        </Text>
      ) : null}
    </Card>
  );
}
