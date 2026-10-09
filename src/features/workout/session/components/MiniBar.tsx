import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useStore } from 'zustand';

import { Icon, PressableScale, Text } from '@/components';
import { useBottomAccessory } from '@/components/navigation/bottomAccessory';
import { shadows } from '@/theme';

import { useNow } from '../../hooks/useNow';
import { formatClock } from '../../hooks/useTicker';
import { activeSession } from '../store';
import { ElapsedClock } from './ElapsedClock';

/** Space the bar takes above the tab bar (its height plus the gap under it). */
const MINI_BAR_ROOM = 64;

/**
 * The workout in progress, docked above the tab bar on every tab: name, elapsed time and the rest
 * countdown. Tap to go back to logging. It reappears after a kill or restart.
 */
export function MiniBar() {
  const router = useRouter();
  const name = useStore(activeSession, (s) => s.doc?.name ?? null);
  const startedAt = useStore(activeSession, (s) => s.doc?.startedAt ?? null);
  const rest = useStore(activeSession, (s) => s.runtime.rest);
  const now = useNow(!!rest);
  const visible = name !== null && startedAt !== null;
  const setHeight = useBottomAccessory((s) => s.setHeight);

  useEffect(() => {
    setHeight(visible ? MINI_BAR_ROOM : 0);
  }, [visible, setHeight]);

  if (!visible) return null;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : null;

  return (
    <View className="px-md pb-sm" style={{ height: MINI_BAR_ROOM }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Workout in progress: ${name}${restLeft !== null ? `, resting ${formatClock(restLeft)}` : ''}. Open`}
        onPress={() => router.push('/session')}
        className="h-14 flex-row items-center gap-md rounded-lg border-t border-edge bg-surface-raised px-lg"
        style={shadows.md}
      >
        <View className="h-2 w-2 rounded-full bg-primary" />
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>
            {name}
          </Text>
          <View className="flex-row gap-sm">
            <ElapsedClock startedAt={startedAt} variant="caption" tone="muted" />
            {restLeft !== null ? (
              <Text variant="caption" tone="primary" numeric>
                Rest {formatClock(restLeft)}
              </Text>
            ) : null}
          </View>
        </View>
        <Icon name="chevron-up" size={20} tone="textMuted" />
      </PressableScale>
    </View>
  );
}
