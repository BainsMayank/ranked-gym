import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { Icon, type IconName } from './Icon';
import { Text, type TextTone } from './Text';
import type { ColorToken } from '@/theme';

export type TagTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export interface TagProps {
  label: string;
  tone?: TagTone;
  icon?: IconName;
  className?: string;
}

const textTone: Record<TagTone, TextTone> = {
  neutral: 'default',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

const iconTone: Record<TagTone, ColorToken> = {
  neutral: 'textMuted',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/**
 * Small static label carrying real state ("Week 3 of 8", "Balanced"). Neutral surface, coloured text only.
 * In a column, pass `self-start` so it doesn't stretch.
 */
export function Tag({ label, tone = 'neutral', icon, className }: TagProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-xs rounded-sm bg-surface-raised px-sm py-xxs',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} tone={iconTone[tone]} /> : null}
      <Text variant="label" tone={textTone[tone]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
