import { Text, type TextProps } from '@/components';
import { elapsedSec } from '@/lib/workouts';

import { formatClock } from '../../hooks/useTicker';
import { useNow } from '../../hooks/useNow';

/** h:mm:ss / m:ss since the start. Only this text re-renders every second. */
export function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  return h > 0
    ? `${h}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
    : formatClock(sec);
}

export function ElapsedClock({ startedAt, ...props }: { startedAt: string } & TextProps) {
  const now = useNow();
  const text = formatElapsed(elapsedSec(startedAt, null, now));
  return (
    <Text numeric accessibilityLabel={`Elapsed ${text}`} {...props}>
      {text}
    </Text>
  );
}
