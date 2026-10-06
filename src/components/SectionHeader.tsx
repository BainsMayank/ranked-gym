import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  /** Muted text on the right (e.g. "Last 12 weeks"). Ignored when `action` is set. */
  meta?: string;
  /** Count shown after the title in the signal colour (e.g. pending requests). */
  count?: number;
  action?: { label: string; onPress: () => void };
  className?: string;
}

/** Title row above a group of content, with an optional muted note or text action. */
export function SectionHeader({ title, meta, count, action, className }: SectionHeaderProps) {
  return (
    <View className={cn('flex-row items-center justify-between gap-md', className)}>
      <Text variant="subheading" className="flex-shrink">
        {title}
        {count !== undefined ? (
          <Text variant="subheading" tone="primary" numeric>
            {' '}
            {count}
          </Text>
        ) : null}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          hitSlop={10}
          className="active:opacity-60"
        >
          <Text variant="label" tone="primary">
            {action.label}
          </Text>
        </Pressable>
      ) : meta ? (
        <Text variant="caption" tone="muted" numberOfLines={1} className="flex-shrink">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
