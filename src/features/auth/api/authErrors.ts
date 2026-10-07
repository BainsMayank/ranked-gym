import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/** Turns Supabase auth errors into short, friendly copy. */
export function authErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'otp_expired':
        return 'That code is wrong or has expired. Check it, or send a new one.';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'Too many attempts. Wait a minute, then try again.';
      case 'email_address_invalid':
        return "That email address doesn't look right.";
      case 'signup_disabled':
        return 'Sign-ups are paused right now. Please try again later.';
      default:
        if (error.status === 429) return 'Too many attempts. Wait a minute, then try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
