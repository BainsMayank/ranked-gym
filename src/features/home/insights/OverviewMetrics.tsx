import { View } from 'react-native';
import { ListGroup, Text } from '@/components';
import type { Analytics } from '@/lib/insights';
const delta = (a: number, b: number) =>
  b
    ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`
    : `${a >= b ? '+' : ''}${Math.round(a - b)}`;
const hours = (s: number) => `${(s / 3600).toFixed(1)} h`;
export function OverviewMetrics({ data }: { data: Analytics }) {
  const current = data.periods[0];
  const prev = data.periods[1];
  const bodyweight =
    data.bodyweight.filter((p) => Date.parse(p.at) >= Date.parse(data.start)) ?? [];
  const first = bodyweight[0],
    last = bodyweight[bodyweight.length - 1];
  const metrics =
    current && prev
      ? [
          [
            'Total volume',
            `${Math.round(current.volume).toLocaleString('en-IN')} kg`,
            delta(current.volume, prev.volume),
          ],
          ['Sessions', String(current.sessions), delta(current.sessions, prev.sessions)],
          ['Total duration', hours(current.duration), delta(current.duration, prev.duration)],
          [
            'Average session',
            current.sessions
              ? `${Math.round(current.duration / current.sessions / 60)} min`
              : 'No sessions',
            prev.sessions
              ? `${Math.round(prev.duration / prev.sessions / 60)} min last period`
              : 'No previous sessions',
          ],
          [
            'Records created',
            String(data.records.length ?? 0),
            delta(data.records.length ?? 0, data.previous_records ?? 0),
          ],
          [
            'Calories (estimate)',
            current.calories === null
              ? 'Add a weigh-in'
              : `${current.calories.toLocaleString('en-IN')} kcal`,
            current.missing_calories
              ? `${current.missing_calories} sessions without an estimate`
              : prev.calories !== null && current.calories !== null
                ? delta(current.calories, prev.calories)
                : 'No previous estimate',
          ],
          [
            'Bodyweight trend',
            last ? `${last.kg} kg` : 'No weigh-ins',
            first && last ? `${(last.kg - first.kg).toFixed(1)} kg in range` : 'Log a weigh-in',
          ],
        ]
      : [];
  return (
    <ListGroup>
      {metrics.map(([label, value, change]) => (
        <View key={label} className="gap-xs p-lg">
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          <Text variant="heading" numeric>
            {value}
          </Text>
          <Text variant="caption" tone="muted" numeric>
            {change}
          </Text>
        </View>
      ))}
    </ListGroup>
  );
}
