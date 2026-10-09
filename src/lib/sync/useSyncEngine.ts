import { useEffect } from 'react';

import { useUserId } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

import { startSyncEngine } from './network';

/**
 * Runs the outbox while someone is signed in: on launch, on every return to the foreground, and
 * straight away when the connection comes back. Mounted once by the tab layout.
 */
export function useSyncEngine(): void {
  const userId = useUserId();
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    return startSyncEngine();
  }, [userId]);
}
