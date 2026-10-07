import { getSupabase } from '@/lib/supabase';

/** Emails a one-time code. The same call signs up a new email or signs in an existing one. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Exchanges the emailed code for a session (the auth listener then updates the app). */
export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
