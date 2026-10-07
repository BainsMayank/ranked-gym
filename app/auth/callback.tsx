import { Redirect } from 'expo-router';

/**
 * Google sign-in returns here (exp://…/--/auth/callback). The browser sheet already handed the URL to
 * signInWithGoogle, which finishes the sign-in; this route only stops the deep link from landing on
 * "not found" (Android) and passes on to the gate.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
