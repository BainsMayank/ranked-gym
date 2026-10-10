import { Card, ListGroup, ListItem, Text } from '@/components';
import { dateKey, type Analytics } from '@/lib/insights';

export function weeklyTotals(data: Analytics, now: number) {
  const today = new Date(now),
    start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const previous = new Date(start);
  previous.setDate(previous.getDate() - 7);
  const previousEnd = new Date(today);
  previousEnd.setDate(previousEnd.getDate() - 7);
  const sum = (a: string, b: string) =>
    data.daily
      .filter((d) => d.day >= a && d.day <= b)
      .reduce(
        (s, d) => ({
          sessions: s.sessions + d.sessions,
          volume: s.volume + d.volume,
          duration: s.duration + d.duration,
        }),
        { sessions: 0, volume: 0, duration: 0 },
      );
  return {
    current: sum(dateKey(start), dateKey(today)),
    previous: sum(dateKey(previous), dateKey(previousEnd)),
  };
}
export function WeeklySummary({ data, now }: { data: Analytics; now: number }) {
  const { current, previous } = weeklyTotals(data, now);
  return (
    <Card className="gap-md">
      <Text variant="heading">This week</Text>
      <Text variant="caption" tone="muted">
        Monday through today, compared with the same weekdays last week.
      </Text>
      <ListGroup>
        <ListItem
          title="Sessions"
          value={`${current.sessions}`}
          subtitle={`${previous.sessions} last week`}
        />
        <ListItem
          title="Volume"
          value={`${(current.volume / 1000).toFixed(1)} t`}
          subtitle={`${(previous.volume / 1000).toFixed(1)} t last week`}
        />
        <ListItem
          title="Training time"
          value={`${Math.round(current.duration / 60)} min`}
          subtitle={`${Math.round(previous.duration / 60)} min last week`}
        />
      </ListGroup>
    </Card>
  );
}
