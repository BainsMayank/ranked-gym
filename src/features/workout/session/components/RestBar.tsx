import { Pressable, View } from 'react-native';

import { Button, Text } from '@/components';

import { useNow } from '../../hooks/useNow';
import { formatClock } from '../../hooks/useTicker';
import { adjustRest, skipRest } from '../controller';
import { useSession, useSessionStore } from '../store';

/** The rest timer folded into a bar under the header (the sheet was swiped away). */
export function RestBar() {
  const store = useSessionStore();
  const rest = useSession((s) => s.runtime.rest);
  const sheetOpen = useSession((s) => s.sheet?.kind === 'rest');
  const now = useNow(!!rest);
  if (!rest || sheetOpen) return null;
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  return (
    <View className="mx-lg mb-sm flex-row items-center gap-sm rounded-md border-t border-edge bg-surface px-md py-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resting, ${formatClock(left)} left. Open rest timer`}
        onPress={() => store.getState().openSheet({ kind: 'rest' })}
        className="flex-1 active:opacity-70"
      >
        <Text variant="subheading" numeric>
          Rest {formatClock(left)}
        </Text>
        {rest.nextLabel ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            Next: {rest.nextLabel}
          </Text>
        ) : null}
      </Pressable>
      <Button
        label="+15"
        variant="secondary"
        size="sm"
        accessibilityLabel="Add 15 seconds"
        onPress={() => adjustRest(store, 15)}
      />
      <Button
        label="Skip"
        variant="secondary"
        size="sm"
        accessibilityLabel="Skip rest"
        onPress={() => skipRest(store)}
      />
    </View>
  );
}
