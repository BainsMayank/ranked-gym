import { View } from 'react-native';

import { Text } from '@/components';
import type { Analytics } from '@/lib/insights';

export function CalendarHeatmap({ days }: { days: Analytics['daily'] }) {
  const offset = (new Date(`${days[0]?.day}T12:00:00`).getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: Number.isFinite(offset) ? offset : 0 }, () => null),
    ...days,
  ];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );
  return (
    <View
      className="gap-sm"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Training calendar. ${
        days
          .filter((d) => d.sessions > 0)
          .map((d) => `${d.day}: ${d.sessions} sessions`)
          .join('. ') || 'No training days'
      }`}
    >
      <View className="flex-row gap-xs">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
          <Text key={i} variant="caption" className="flex-1 text-center" tone="muted">
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} className="flex-row gap-xs">
          {Array.from({ length: 7 }, (_, j) => {
            const day = week[j];
            return (
              <View
                key={j}
                className={`h-8 flex-1 items-center justify-center rounded-sm ${day?.sessions ? 'bg-primary' : 'bg-surface-raised'}`}
              >
                <Text variant="caption" tone={day?.sessions ? 'inverse' : 'muted'}>
                  {day ? Number(day.day.slice(-2)) : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
