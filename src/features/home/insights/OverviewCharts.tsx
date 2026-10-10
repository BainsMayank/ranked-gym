import { BarChart, Button, LineChart, Text } from '@/components';
import { dateKey, movingAverage, type Analytics } from '@/lib/insights';
import { useTheme } from '@/theme';
import { CalendarHeatmap } from './CalendarHeatmap';
export function OverviewCharts({ data, onLog }: { data: Analytics; onLog: () => void }) {
  const { colors } = useTheme();
  const bodyweight = data.bodyweight.filter((p) => Date.parse(p.at) >= Date.parse(data.start));
  const daily = data.daily.filter((d) => d.day >= dateKey(new Date(data.start)));
  const duration =
    daily.map((d) => ({ x: Date.parse(`${d.day}T12:00:00`), y: d.duration / 60 })) ?? [];
  const formatX = (x: number) =>
    new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <>
      <Text variant="heading">Daily volume</Text>
      <BarChart
        data={daily.map((d) => ({ value: d.volume })) ?? []}
        accessibilityLabel={`Daily volume in kg. ${daily.map((d) => `${d.day}: ${d.volume}`).join('; ')}`}
      />
      <Text variant="caption" tone="muted">
        {daily[0]?.day} to {daily[daily.length - 1]?.day} · kg
      </Text>
      <Text variant="heading">Session duration</Text>
      <LineChart
        data={duration}
        yDomain={[0, Math.max(10, ...duration.map((point) => point.y))]}
        color={colors.textMuted}
        formatX={formatX}
        accessibilityLabel={`Daily training minutes: ${duration.map((p) => `${formatX(p.x)}: ${Math.round(p.y)}`).join('; ')}`}
      />
      <Text variant="heading">Training days</Text>
      <CalendarHeatmap days={daily ?? []} />
      <Text variant="heading">Bodyweight</Text>
      <Button label="Log bodyweight" variant="outline" onPress={() => onLog()} />
      {bodyweight.length ? (
        <>
          <Text variant="caption" tone="muted">
            Logged weigh-ins (kg)
          </Text>
          <LineChart
            data={bodyweight.map((p) => ({ x: Date.parse(p.at), y: p.kg }))}
            formatX={formatX}
            accessibilityLabel={`Bodyweight: ${bodyweight.map((p) => `${formatX(Date.parse(p.at))}: ${p.kg} kg`).join('; ')}`}
          />
          <Text variant="caption" tone="muted">
            7-day moving average, from available weigh-ins (kg)
          </Text>
          <LineChart
            data={movingAverage(data.bodyweight ?? []).filter(
              (p) => p.x >= Date.parse(data.start ?? ''),
            )}
            color={colors.textMuted}
            formatX={formatX}
            accessibilityLabel="Bodyweight 7-day moving average"
          />
        </>
      ) : (
        <Text tone="muted">No weigh-ins in this range. Log one to start your trend.</Text>
      )}
    </>
  );
}
