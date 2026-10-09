import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState } from '@/components';
import { useDiscardWorkout } from '@/lib/workouts';

import { cancelPendingSave, flushActiveSession, skipRest } from '../session/controller';
import { NumericKeypad } from '../session/components/NumericKeypad';
import { ReorderSession } from '../session/components/ReorderSession';
import { RestBar } from '../session/components/RestBar';
import { SessionHeader } from '../session/components/SessionHeader';
import { SessionList } from '../session/components/SessionList';
import { SessionSheets } from '../session/components/SessionSheets';
import { useStartWorkout } from '../session/hooks/useStartWorkout';
import { SessionEnvProvider } from '../session/SessionEnv';
import { activeSession, useSession } from '../session/store';

/**
 * The live workout (full screen, slides up). Minimise keeps it running behind the mini bar; Finish
 * goes to the summary. Everything is saved on the phone as you go, and the screen stays awake.
 */
export function LoggingScreen() {
  useKeepAwake();
  const router = useRouter();
  const hasDoc = useSession((s) => !!s.doc);
  const reordering = useSession((s) => s.reordering);
  const discard = useDiscardWorkout();
  const start = useStartWorkout();

  if (!hasDoc) {
    return (
      <SafeAreaView className="flex-1 bg-background px-lg" edges={['top', 'bottom']}>
        <EmptyState
          icon="barbell-outline"
          title="No workout in progress"
          description="Start one and log as you go. It works offline."
        />
        <Button label="Start an empty workout" onPress={() => start({ kind: 'empty' })} />
        <Button label="Close" variant="ghost" className="mt-sm" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const finish = () => {
    activeSession.getState().openKeypad(null);
    void flushActiveSession();
    router.push('/session/finish');
  };

  const confirmDiscard = () => {
    const doc = activeSession.getState().doc;
    if (!doc) return;
    Alert.alert('Discard this workout?', 'Everything you logged in it will be deleted.', [
      { text: 'Keep logging', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            await cancelPendingSave();
            skipRest(activeSession);
            await discard.mutateAsync(doc.id);
            activeSession.getState().reset();
            router.back();
          })(),
      },
    ]);
  };

  return (
    <SessionEnvProvider>
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <SessionHeader onMinimise={() => router.back()} onFinish={finish} />
        <RestBar />
        {reordering ? (
          <ScrollView className="flex-1">
            <ReorderSession />
          </ScrollView>
        ) : (
          <SessionList onDiscard={confirmDiscard} />
        )}
        <NumericKeypad />
      </SafeAreaView>
      <SessionSheets />
    </SessionEnvProvider>
  );
}
