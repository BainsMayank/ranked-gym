import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { showToast } from '@/components';
import { useSaveWorkoutEdit, useWorkoutRecord } from '@/lib/workouts';

import { NumericKeypad } from '../session/components/NumericKeypad';
import { ReorderSession } from '../session/components/ReorderSession';
import { SessionHeader } from '../session/components/SessionHeader';
import { SessionList } from '../session/components/SessionList';
import { SessionSheets } from '../session/components/SessionSheets';
import { SessionEnvProvider } from '../session/SessionEnv';
import { createSessionStore, selectDirty, SessionStoreProvider } from '../session/store';

/**
 * Edit a finished workout with the logging UI, in its own session (a workout in progress is
 * untouched). Saving sends it as an edit; the server keeps the previous version as a revision.
 */
export function EditWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: record } = useWorkoutRecord(id);
  const [store] = useState(() => createSessionStore('edit'));
  const loaded = useStore(store, (s) => !!s.doc);
  const reordering = useStore(store, (s) => s.reordering);
  const save = useSaveWorkoutEdit();

  useEffect(() => {
    if (record && !store.getState().doc) store.getState().load(record.doc);
  }, [record, store]);

  const navigation = useNavigation();
  const dirty = useStore(store, selectDirty);
  // Any way out (close, swipe, Android back) asks before throwing edits away.
  usePreventRemove(dirty, ({ data }) =>
    Alert.alert('Discard your changes?', 'The workout stays as it was.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]),
  );

  const close = () => router.back();
  const submit = async () => {
    const doc = store.getState().doc;
    if (!doc) return;
    if (selectDirty(store.getState())) {
      await save.mutateAsync(doc);
      // Saved: no longer dirty, so the leave guard lets go (after it re-renders).
      store.getState().markSaved();
      await new Promise((resolve) => setTimeout(resolve, 0));
      showToast({ message: 'Changes saved', above: 'none' });
    }
    router.back();
  };

  return (
    <SessionStoreProvider value={store}>
      <SessionEnvProvider>
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
          {loaded ? (
            <>
              <SessionHeader onMinimise={close} onFinish={() => void submit()} />
              {reordering ? (
                <ScrollView className="flex-1">
                  <ReorderSession />
                </ScrollView>
              ) : (
                <SessionList />
              )}
              <NumericKeypad />
            </>
          ) : null}
        </SafeAreaView>
        <SessionSheets />
      </SessionEnvProvider>
    </SessionStoreProvider>
  );
}
