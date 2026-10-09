import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import {
  addDays,
  daysBetween,
  mondayOf,
  weekdayShort,
  type PlanDay,
  type PlanDoc,
} from '@/lib/plans';
import { cn } from '@/lib/utils';

import { formatPlanDate } from '../format';
import { stateOf } from '../view';

interface PlanCalendarProps {
  plan: PlanDoc;
  today: string;
  selectedMonday: string;
  onSelectWeek: (monday: string) => void;
  onPressDay: (day: PlanDay) => void;
}

/** Calendar weeks of the plan (Mon–Sun rows): done, missed, upcoming and rest days at a glance. */
export function PlanCalendar({
  plan,
  today,
  selectedMonday,
  onSelectWeek,
  onPressDay,
}: PlanCalendarProps) {
  const first = mondayOf(plan.weeks[0]?.startsOn ?? plan.startDate);
  const rows = Math.floor(daysBetween(first, mondayOf(plan.endDate)) / 7) + 1;
  const byDate = new Map(plan.days.map((d) => [d.date, d]));
  const deload = new Set(plan.weeks.filter((w) => w.deload).map((w) => w.startsOn));

  return (
    <View className="gap-xs">
      <View className="flex-row gap-xs">
        <View className="w-12" />
        {weekdayShort.map((d) => (
          <Text key={d} variant="overline" tone="muted" className="flex-1 text-center">
            {d.slice(0, 1)}
          </Text>
        ))}
      </View>
      {Array.from({ length: rows }, (_, r) => {
        const monday = addDays(first, r * 7);
        const selected = monday === selectedMonday;
        return (
          <View key={monday} className="flex-row items-center gap-xs">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Week ${r + 1}${deload.has(monday) ? ', deload' : ''}`}
              accessibilityState={{ selected }}
              onPress={() => onSelectWeek(monday)}
              hitSlop={6}
              className="w-12"
            >
              <Text variant="label" tone={selected ? 'primary' : 'muted'} numeric>
                W{r + 1}
              </Text>
              {deload.has(monday) ? (
                <Text variant="caption" tone="muted">
                  Deload
                </Text>
              ) : null}
            </Pressable>
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(monday, i);
              const day = byDate.get(date) ?? null;
              const state = stateOf(day, date, today);
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatPlanDate(date)}: ${day ? `${day.label}, ${state}` : 'rest'}`}
                  disabled={!day}
                  onPress={() => day && onPressDay(day)}
                  className={cn(
                    'h-10 flex-1 items-center justify-center rounded-sm',
                    state === 'today'
                      ? 'bg-text'
                      : day
                        ? 'bg-surface-raised'
                        : date === today
                          ? 'border border-text'
                          : 'border border-dashed border-border',
                  )}
                >
                  {state === 'done' ? (
                    <Icon name="checkmark" size={14} tone="success" />
                  ) : state === 'missed' ? (
                    <Icon name="close" size={14} tone="danger" />
                  ) : day ? (
                    <Text variant="caption" tone={state === 'today' ? 'inverse' : 'default'}>
                      {day.label.slice(0, 1)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
