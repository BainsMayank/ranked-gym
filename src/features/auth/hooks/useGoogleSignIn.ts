import { useState } from 'react';

import { authErrorMessage } from '../api/authErrors';
import { signInWithGoogle } from '../api/google';

/** Runs the Google browser flow and exposes a friendly error. Success is picked up by the auth gate. */
export function useGoogleSignIn() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      if (__DEV__) console.warn('Google sign-in failed', e);
      setError(authErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return { start, pending, error };
}
