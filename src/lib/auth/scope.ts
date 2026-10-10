import { useAuthStore } from './authStore';

export function requireAccount(): string {
  const id = useAuthStore.getState().session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** Reject stale server pulls before they can repopulate a different account's local data. */
export function assertAccount(id: string): void {
  if (useAuthStore.getState().session?.user.id !== id) {
    throw new Error('Account changed during sync');
  }
}
