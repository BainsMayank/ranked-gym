import { useQuery } from '@tanstack/react-query';

import { getSupabase } from '@/lib/supabase';
import { useDebouncedValue } from '@/lib/utils';

import { profileKeys } from './keys';
import { usernameSchema } from './schemas';

export type UsernameStatus =
  'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'offline' | 'error';

const DEBOUNCE_MS = 400;

/**
 * Checks a username with the server once typing pauses. `current` is the user's own username, which
 * always counts as available. Format errors come from the zod schema, without a network call.
 */
export function useUsernameAvailability(name: string, current?: string | null) {
  const value = name.trim();
  const valid = usernameSchema.safeParse(value).success;
  const isCurrent = !!current && value === current;
  const debounced = useDebouncedValue(value, DEBOUNCE_MS);
  const settled = debounced === value;

  const query = useQuery({
    queryKey: profileKeys.username(debounced),
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('username_available', { name: debounced });
      if (error) throw error;
      return data;
    },
    enabled: valid && settled && !isCurrent,
    staleTime: 15_000,
    retry: 1,
    networkMode: 'online',
  });

  let status: UsernameStatus;
  if (value === '') status = 'idle';
  else if (!valid) status = 'invalid';
  else if (isCurrent) status = 'available';
  else if (!settled || query.isFetching) status = 'checking';
  else if (query.isPaused) status = 'offline';
  else if (query.isError) status = 'error';
  else if (query.data === true) status = 'available';
  else if (query.data === false) status = 'taken';
  else status = 'checking';

  return { status, refetch: query.refetch };
}
