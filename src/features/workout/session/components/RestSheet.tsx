import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import { useWorkoutPrefs } from '@/lib/workouts';

import { useNow } from '../../hooks/useNow';
import { adjustRest, skipRest } from '../controller';
import { notifyPermission, requestNotifyPermission } from '../restNotifications';
import { useSession, useSessionStore } from '../store';
import { RestRing } from './RestRing';

/**
 * The big rest countdown that opens when a set is ticked. Swipe it away to keep logging (it folds
 * into the bar under the header). The first time, it offers notifications so the phone buzzes when
 * rest is over even when locked: asked here, at the moment it matters, never on launch.
 */
export function RestSheet() {
  const store = useSessionStore();
  const visible = useSession((s) => s.sheet?.kind === 'rest' && !!s.runtime.rest);
  const rest = useSession((s) => s.runtime.rest);
  const now = useNow(visible, 250);
  const asked = useWorkoutPrefs((s) => s.notifyAsked);
  const updatePrefs = useWorkoutPrefs((s) => s.update);
  const [canAsk, setCanAsk] = useState(false);

  useEffect(() => {
    if (!visible || asked) return;
    void notifyPermission().then((p) => setCanAsk(p === 'undetermined'));
  }, [visible, asked]);

  const close = () => store.getState().openSheet(null);
  const left = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0;

  return (
    <Sheet visible={visible} onClose={close}>
      {rest ? (
        <View className="items-center gap-lg pb-sm">
          <Text variant="overline" tone="muted">
            Rest
          </Text>
          <RestRing
            left={left}
            total={rest.totalSec}
            size={220}
            stroke={10}
            textVariant="display"
          />
          <Text variant="body" tone="muted" numberOfLines={2} className="text-center">
            {rest.nextLabel ? `Up next: ${rest.nextLabel}` : 'Last set done. Finish when ready.'}
          </Text>
          <View className="w-full flex-row gap-sm">
            <Button
              label="−15s"
              variant="secondary"
              className="flex-1"
              accessibilityLabel="Take off 15 seconds"
              onPress={() => adjustRest(store, -15)}
            />
            <Button
              label="+15s"
              variant="secondary"
              className="flex-1"
              accessibilityLabel="Add 15 seconds"
              onPress={() => adjustRest(store, 15)}
            />
            <Button
              label="Skip"
              variant="outline"
              className="flex-1"
              accessibilityLabel="Skip rest"
              onPress={() => skipRest(store)}
            />
          </View>
          {canAsk && !asked ? (
            <View className="w-full gap-sm rounded-md bg-surface-raised p-md">
              <Text variant="label">Buzz when rest is over?</Text>
              <Text variant="caption" tone="muted">
                We&apos;ll send one notification at the end of each rest, even if your phone is
                locked.
              </Text>
              <View className="flex-row gap-sm">
                <Button
                  label="Turn on"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    updatePrefs({ notifyAsked: true });
                    void requestNotifyPermission().then((ok) => {
                      // Re-schedule this rest now that we can.
                      const r = store.getState().runtime.rest;
                      if (ok && r) adjustRest(store, 0);
                    });
                  }}
                />
                <Button
                  label="Not now"
                  variant="ghost"
                  size="sm"
                  onPress={() => updatePrefs({ notifyAsked: true })}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
