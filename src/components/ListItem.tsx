import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon } from './Icon';
import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Muted value on the right, e.g. "kg · cm". */
  value?: string;
  /** Element before the text (avatar, badge). */
  leading?: ReactNode;
  /** Element at the end (button). Replaces the chevron. */
  trailing?: ReactNode;
  /** Inline element after the title (e.g. a rank tag). */
  titleAccessory?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** One row inside a ListGroup. Pressable rows get a chevron unless `trailing` is set. */
export function ListItem({
  title,
  subtitle,
  value,
  leading,
  trailing,
  titleAccessory,
  onPress,
  className,
}: ListItemProps) {
  const content = (
    <>
      {leading}
      <View className="flex-1 gap-xxs">
        <View className="flex-row flex-wrap items-center gap-x-sm">
          <Text variant="subheading" numberOfLines={1} className="flex-shrink">
            {title}
          </Text>
          {titleAccessory}
        </View>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="label" tone="muted" numberOfLines={1} className="max-w-40">
          {value}
        </Text>
      ) : null}
      {trailing ?? (onPress ? <Icon name="chevron-forward" size={16} tone="textMuted" /> : null)}
    </>
  );
  const classes = cn('min-h-14 flex-row items-center gap-md px-lg py-md', className);

  if (onPress && !trailing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, value].filter(Boolean).join(', ')}
        accessibilityHint={subtitle}
        onPress={onPress}
        className={cn(classes, 'active:bg-surface-raised')}
      >
        {content}
      </Pressable>
    );
  }
  return <View className={classes}>{content}</View>;
}
