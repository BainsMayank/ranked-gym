import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';
import { shadows } from '@/theme';

import { PressableScale } from './PressableScale';

interface CardBaseProps extends ViewProps {
  raised?: boolean;
  padded?: boolean;
  className?: string;
}

type CardProps =
  | (CardBaseProps & { onPress?: undefined; accessibilityLabel?: string })
  | (CardBaseProps & { onPress: () => void; accessibilityLabel: string });

/**
 * A card is a discrete, self-contained object (often tappable). Group lists with hairlines, not cards.
 * Depth: borderless surface, a lighter top `edge` ("lit from above") and a soft shadow when raised.
 */
export function Card({ raised, padded = true, className, onPress, style, ...rest }: CardProps) {
  const classes = cn(
    'rounded-lg border-t border-edge',
    raised ? 'bg-surface-raised' : 'bg-surface',
    padded && 'p-lg',
    className,
  );
  const shadow = raised ? shadows.md : shadows.sm;

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        className={classes}
        style={[shadow, style]}
        {...rest}
      />
    );
  }
  return <View className={classes} style={[shadow, style]} {...rest} />;
}
