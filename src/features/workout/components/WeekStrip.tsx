import { Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import { weekdayNames, weekdayShort } from '@/lib/plans';
import { cn } from '@/lib/utils';

import type { StripDay } from '../plan/view';

const SPOKEN = {
  done: 'done',
  missed: 'missed',
  today: 'today',
  upcoming: 'coming up',
  rest: 'rest day',
};

interface WeekStripProps {
  days: readonly StripDay[];
  onPressDay?: (day: StripDay) => void;
}

/** The plan's week: sessions on a surface (done ticked, missed marked), rest days outlined, today inverted. */
export function WeekStrip({ days, onPressDay }: WeekStripProps) {
  return (
    <View className="flex-row gap-xs">
      {days.map((d, i) => {
        const today = d.state === 'today';
        const rest = d.state === 'rest';
        const label = d.day?.label.split(' ')[0] ?? 'Rest';
        return (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityLabel={`${weekdayNames[i]}: ${d.day?.label ?? 'Rest'}, ${SPOKEN[d.state]}`}
            disabled={!d.day || !onPressDay}
            onPress={() => onPressDay?.(d)}
            className={cn(
              'min-h-14 flex-1 items-center justify-center gap-xxs rounded-md py-sm',
              today ? 'bg-text' : rest ? 'border border-dashed border-border' : 'bg-surface-raised',
            )}
          >
            <Text variant="overline" tone={today ? 'inverse' : 'muted'}>
              {weekdayShort[i]}
            </Text>
            {d.state === 'done' ? (
              <Icon name="checkmark" size={14} tone="success" />
            ) : d.state === 'missed' ? (
              <Icon name="close" size={14} tone="danger" />
            ) : (
              <Text
                variant="caption"
                tone={today ? 'inverse' : rest ? 'muted' : 'default'}
                numberOfLines={1}
              >
                {label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
