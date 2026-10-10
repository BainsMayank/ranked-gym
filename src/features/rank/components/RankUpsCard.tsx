import { View } from 'react-native';

import { BarChart, Card, Text } from '@/components';
import {
  DAY_PARTS,
  peakIndex,
  rankUpsByDayPart,
  rankUpsByWeekday,
  WEEKDAYS,
  type RankEvent,
} from '@/lib/ranks';

const DAY_NAMES = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
];

/** When rank-ups happen: by weekday and by time of day, with the strongest of each called out. */
export function RankUpsCard({ events }: { events: readonly RankEvent[] }) {
  const byDay = rankUpsByWeekday(events);
  const byPart = rankUpsByDayPart(events);
  const total = byDay.reduce((a, b) => a + b, 0);
  const day = peakIndex(byDay);
  const part = peakIndex(byPart);

  return (
    <Card className="gap-md">
      <View className="flex-row items-center justify-between">
        <Text variant="subheading">Rank-ups by day</Text>
        <Text variant="caption" tone="muted" numeric>
          {total} lift rank-up{total === 1 ? '' : 's'}
        </Text>
      </View>
      {total === 0 ? (
        <Text tone="muted">
          Your first lift rank-up starts this chart. Beat a set you’ve done before.
        </Text>
      ) : (
        <>
          <BarChart
            data={byDay.map((value, i) => ({ value, label: WEEKDAYS[i] }))}
            highlightIndex={day ?? -1}
            showValues
            accessibilityLabel={`Rank-ups by weekday: ${byDay.map((v, i) => `${WEEKDAYS[i]} ${v}`).join(', ')}`}
          />
          <BarChart
            data={byPart.map((value, i) => ({ value, label: DAY_PARTS[i] }))}
            highlightIndex={part ?? -1}
            showValues
            height={64}
            accessibilityLabel={`Rank-ups by time of day: ${byPart.map((v, i) => `${DAY_PARTS[i]} ${v}`).join(', ')}`}
          />
          {day !== null ? (
            <Text tone="muted">
              {DAY_NAMES[day]}
              {part !== null ? ` and ${DAY_PARTS[part]?.toLowerCase()} sessions` : ''} are your
              strongest — schedule heavy top sets there.
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}
