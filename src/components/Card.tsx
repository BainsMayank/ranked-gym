import { Pressable, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';
import { shadows } from '@/theme';

interface CardBaseProps extends ViewProps {
  raised?: boolean;
  padded?: boolean;
  className?: string;
}

type CardProps =
  | (CardBaseProps & { onPress?: undefined; accessibilityLabel?: string })
  | (CardBaseProps & { onPress: () => void; accessibilityLabel: string });

export function Card({ raised, padded = true, className, onPress, style, ...rest }: CardProps) {
  const classes = cn(
    'rounded-lg border border-border',
    raised ? 'bg-surface-raised' : 'bg-surface',
    padded && 'p-lg',
    className,
  );
  const shadow = raised ? shadows.md : shadows.none;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(classes, 'active:opacity-80')}
        style={[shadow, style]}
        {...rest}
      />
    );
  }
  return <View className={classes} style={[shadow, style]} {...rest} />;
}
