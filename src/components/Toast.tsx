import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { shadows } from '@/theme';

import { Text } from './Text';

export interface ToastOptions {
  message: string;
  /** e.g. "Undo". The toast closes when it's pressed. */
  actionLabel?: string;
  onAction?: () => void;
  /** Runs when the toast goes away without the action (e.g. commit a delete). */
  onDismiss?: () => void;
  /** Lift above a tab bar or a pinned footer. Default 'tabBar'. */
  above?: 'tabBar' | 'footer' | 'none';
  durationMs?: number;
}

interface ToastState {
  current: (ToastOptions & { id: number }) | null;
  show: (options: ToastOptions) => void;
  hide: (acted: boolean) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>()((set, get) => ({
  current: null,
  show: (options) => {
    // A new toast settles the previous one as dismissed (its delete goes through).
    get().current?.onDismiss?.();
    set({ current: { ...options, id: nextId++ } });
  },
  hide: (acted) => {
    const current = get().current;
    if (!current) return;
    if (!acted) current.onDismiss?.();
    set({ current: null });
  },
}));

/** Shows a short message at the bottom of the screen, optionally with one action (Undo). */
export function showToast(options: ToastOptions): void {
  useToastStore.getState().show(options);
}

const OFFSET = { tabBar: 72, footer: 104, none: 16 } as const;

/** Mount once at the root. Renders the current toast above the tab bar or footer. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!current) return;
    timer.current = setTimeout(() => hide(false), current.durationMs ?? 5000);
    return () => clearTimeout(timer.current);
  }, [current, hide]);

  if (!current) return null;
  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-lg"
      style={{ bottom: insets.bottom + OFFSET[current.above ?? 'tabBar'] }}
    >
      <Animated.View
        key={current.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(150)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={shadows.lg}
      >
        <View className="min-h-12 flex-row items-center gap-md rounded-md bg-surface-raised pl-lg pr-sm">
          <Text variant="body" className="flex-1 py-md" numberOfLines={2}>
            {current.message}
          </Text>
          {current.actionLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={current.actionLabel}
              hitSlop={8}
              onPress={() => {
                current.onAction?.();
                hide(true);
              }}
              className="min-h-11 justify-center px-md active:opacity-70"
            >
              <Text variant="label" tone="primary">
                {current.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
