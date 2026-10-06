import { PressableScale, Text } from '@/components';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
}

/** Selectable choice tile. Selected = inverted, matching chips and segmented controls. */
export function OptionCard({ title, subtitle, selected, onPress, className }: OptionCardProps) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      containerStyle={{ flexBasis: '47%', flexGrow: 1 }}
      className={cn(
        'min-h-20 gap-xxs rounded-lg p-lg',
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
