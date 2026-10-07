import { cn } from '@/lib/utils';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface OptionCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Full-width row (for longer descriptions) instead of a half-width tile. */
  wide?: boolean;
  className?: string;
}

/** Selectable choice tile. Selected = inverted, matching chips and segmented controls. */
export function OptionCard({
  title,
  subtitle,
  selected,
  onPress,
  wide = false,
  className,
}: OptionCardProps) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      containerStyle={wide ? { width: '100%' } : { flexBasis: '47%', flexGrow: 1 }}
      className={cn(
        'gap-xxs rounded-lg p-lg',
        wide ? 'min-h-16' : 'min-h-20',
        selected ? 'bg-text' : 'bg-surface',
        className,
      )}
    >
      <Text variant="subheading" tone={selected ? 'inverse' : 'default'}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" tone={selected ? 'inverse' : 'muted'}>
          {subtitle}
        </Text>
      ) : null}
    </PressableScale>
  );
}
