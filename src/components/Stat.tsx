import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { Text, type TextTone } from './Text';

export interface StatProps {
  label: string;
  value: string;
  /** Small line under the value, e.g. "+12%". */
  delta?: string;
  deltaTone?: TextTone;
  valueTone?: TextTone;
  /** Sits on a raised tile instead of bare. */
  boxed?: boolean;
  center?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

/** A labelled number. Bare by default; `boxed` for tile grids. Values use tabular figures. */
export function Stat({
  label,
  value,
  delta,
  deltaTone = 'success',
  valueTone = 'default',
  boxed = false,
  center = false,
  size = 'md',
  className,
}: StatProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${delta ? `, ${delta}` : ''}`}
      className={cn(
        'gap-xxs',
        boxed && 'rounded-md bg-surface-raised px-md py-md',
        center && 'items-center',
        className,
      )}
    >
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant={size === 'lg' ? 'title' : 'heading'}
        tone={valueTone}
        numeric
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {delta ? (
        <Text variant="caption" tone={deltaTone} numeric>
          {delta}
        </Text>
      ) : null}
    </View>
  );
}
