import { Alert } from 'react-native';

import { flushNow, NOTHING_PENDING, pendingSummary, type PendingSummary } from '@/lib/sync';

import { signOut } from './signOut';

/**
 * Signing out clears this phone's workouts, routines and outbox (they belong to the account), so
 * anything not yet pushed would be lost. With the outbox empty this signs out straight away;
 * otherwise it asks first and offers a sync. Resolves once the person has signed out or backed out.
 */
export async function confirmSignOut(): Promise<void> {
  const pending = await pendingSummary().catch(() => NOTHING_PENDING);
  if (pending.total === 0) return signOut();
  return new Promise<void>((resolve, reject) => ask(pending, false, resolve, reject));
}

function ask(
  pending: PendingSummary,
  retried: boolean,
  resolve: () => void,
  reject: (error: unknown) => void,
): void {
  const leave = () => void signOut().then(resolve, reject);
  const syncFirst = async () => {
    await flushNow().catch(() => undefined);
    const left = await pendingSummary().catch(() => pending);
    if (left.total === 0) leave();
    else ask(left, true, resolve, reject);
  };
  Alert.alert(
    `${pending.total} unsynced ${pending.total === 1 ? 'change' : 'changes'}`,
    `${retried ? 'Couldn’t sync yet. Check your connection. ' : ''}${pendingMessage(pending)}`,
    [
      { text: 'Try to sync first', onPress: () => void syncFirst().catch(reject) },
      { text: 'Sign out anyway', style: 'destructive', onPress: leave },
      { text: 'Cancel', style: 'cancel', onPress: resolve },
    ],
    { cancelable: true, onDismiss: resolve },
  );
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "2 workouts and 1 routine are saved only on this phone. …" */
export function pendingMessage(p: PendingSummary): string {
  const parts = [
    p.workouts && plural(p.workouts, 'workout'),
    p.photos && plural(p.photos, 'workout photo'),
    p.routines && plural(p.routines, 'routine'),
    p.folders && plural(p.folders, 'folder'),
    p.plans && plural(p.plans, 'plan'),
  ].filter((part): part is string => Boolean(part));
  const list =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${list} ${p.total === 1 ? 'is' : 'are'} saved only on this phone. If you sign out now, ${p.total === 1 ? 'it’s' : 'they’re'} lost.`;
}
