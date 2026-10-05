import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'sparkles-outline',
  action,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center gap-md px-xl py-xxl', className)}>
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-raised">
        <Icon name={icon} size={30} tone="primary" />
      </View>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {description ? (
        <Text tone="muted" className="max-w-80 text-center">
          {description}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}
