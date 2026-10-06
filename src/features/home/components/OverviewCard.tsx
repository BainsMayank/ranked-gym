import { View } from 'react-native';

import { BarChart, Card, SectionHeader, Stat } from '@/components';

import { overview } from '../mocks';

/** 14-day training overview: daily volume bars and the period's headline numbers. */
export function OverviewCard() {
  return (
    <Card className="gap-lg">
      <SectionHeader title="Overview" meta="Last 14 days" />
      <BarChart
        data={overview.dailyVolume.map((value) => ({ value }))}
        height={72}
        accessibilityLabel="Training volume per day, last 14 days"
      />
      <View className="flex-row flex-wrap gap-sm">
        {overview.stats.map((s) => (
          <Stat
            key={s.label}
            label={s.label}
            value={s.value}
            delta={s.delta}
            deltaTone="muted"
            boxed
            className="min-w-[30%] flex-1"
          />
        ))}
      </View>
    </Card>
  );
}
