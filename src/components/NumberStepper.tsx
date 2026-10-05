import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface NumberStepperProps {
  /** Accessible name, e.g. "Weight" or "Reps". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  format?: (value: number) => string;
  className?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Rounds away float drift (e.g. 0.1 + 0.2) to the step's precision. */
function roundToStep(n: number, step: number) {
  const decimals = (step.toString().split('.')[1] ?? '').length;
  return Number(n.toFixed(decimals));
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  format = (v) => String(v),
  className,
}: NumberStepperProps) {
  const change = (delta: number) => onChange(clamp(roundToStep(value + delta, step), min, max));
  const display = `${format(value)}${unit ? ` ${unit}` : ''}`;

  return (
    <View
      className={cn(
        'flex-row items-center gap-sm self-start rounded-md bg-surface-raised p-xs',
        className,
      )}
    >
      <IconButton
        icon="remove"
        size="sm"
        variant="surface"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => change(-step)}
      />
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: display }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          change(e.nativeEvent.actionName === 'increment' ? step : -step)
        }
        className="min-w-16 items-center"
      >
        <Text variant="subheading">{display}</Text>
      </View>
      <IconButton
        icon="add"
        size="sm"
        variant="surface"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => change(step)}
      />
    </View>
  );
}
