import { View } from 'react-native';

import { Icon, Text } from '@/components';
import { cn } from '@/lib/utils';

import { plan } from '../mocks';

/** The plan's week: training days on a surface, rest days outlined, today inverted. */
export function WeekStrip() {
  return (
    <View className="flex-row gap-xs">
      {plan.days.map((d, i) => {
        const isToday = i === plan.todayIndex;
        const isRest = d.focus === 'Rest';
        return (
          <View
            key={d.day}
            accessible
            accessibilityLabel={`${d.day}: ${d.focus}${isToday ? ', today' : ''}${d.done ? ', done' : ''}`}
            className={cn(
              'flex-1 items-center gap-xxs rounded-md py-sm',
              isToday
                ? 'bg-text'
                : isRest
                  ? 'border border-dashed border-border'
                  : 'bg-surface-raised',
            )}
          >
            <Text variant="overline" tone={isToday ? 'inverse' : 'muted'}>
              {d.day}
            </Text>
            {d.done ? (
              <Icon name="checkmark" size={14} tone="success" />
            ) : (
              <Text
                variant="caption"
                tone={isToday ? 'inverse' : isRest ? 'muted' : 'default'}
                numberOfLines={1}
              >
                {d.focus}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
