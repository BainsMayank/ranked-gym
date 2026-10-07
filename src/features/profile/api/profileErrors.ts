import { MIN_AGE } from '@/lib/profile';

interface PostgrestLike {
  code?: string;
  message?: string;
}

const isPostgrestLike = (e: unknown): e is PostgrestLike =>
  typeof e === 'object' && e !== null && ('code' in e || 'message' in e);

/** Friendly copy for a failed profile save. The database re-checks everything the forms check. */
export function profileErrorMessage(error: unknown): string {
  if (isPostgrestLike(error)) {
    const message = error.message ?? '';
    if (error.code === '23505' && message.includes('username')) {
      return 'That username was just taken. Try another.';
    }
    if (message.includes('profiles_min_age') || message.includes('at least 13')) {
      return `You need to be at least ${MIN_AGE} to use Ranked Gym.`;
    }
    if (error.code === '23514') return 'One of those values isn’t allowed. Check and try again.';
    if (message.includes('Network request failed') || message.includes('Failed to fetch')) {
      return "You're offline. Connect to the internet to save.";
    }
  }
  if (error instanceof TypeError) return "You're offline. Connect to the internet to save.";
  return "Couldn't save. Please try again.";
}
