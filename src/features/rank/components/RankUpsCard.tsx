import { BarChart, Card, SectionHeader, Text } from '@/components';

import { rankUpsByDay } from '../mocks';

export function RankUpsCard() {
  const total = rankUpsByDay.reduce((sum, d) => sum + d.value, 0);
  const best = rankUpsByDay.reduce((a, b) => (b.value > a.value ? b : a));
  const bestIndex = rankUpsByDay.indexOf(best);
  return (
    <Card className="gap-md">
      <SectionHeader title="Rank-ups by weekday" meta={`This season · ${total} total`} />
      <BarChart
        data={rankUpsByDay}
        highlightIndex={bestIndex}
        showValues
        height={88}
        accessibilityLabel={`Rank-ups by weekday. Most on ${best.label}: ${best.value}.`}
      />
      <Text variant="caption" tone="muted">
        {best.label}days are your strongest day. Schedule heavy top sets there.
      </Text>
    </Card>
  );
}
