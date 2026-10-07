import { getSupabase } from '@/lib/supabase';

/**
 * Ends this device's session. The local session is always removed, even offline (the server-side
 * revoke is best effort), and the auth listener then clears cached queries and the route guard
 * returns to Welcome.
 */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut({ scope: 'local' });
}
