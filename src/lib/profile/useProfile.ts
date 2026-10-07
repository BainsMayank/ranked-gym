import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUserId } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { profileKeys } from './keys';
import { writeOnboarded } from './onboardedCache';

export type Profile = Database['public']['Tables']['profiles']['Row'];
/** Columns the app may change. id, timestamps and the like are protected by the database. */
export type ProfileUpdate = Omit<
  Database['public']['Tables']['profiles']['Update'],
  'id' | 'created_at' | 'updated_at'
>;

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/** The signed-in user's own profile (all columns; RLS allows only their row). */
export function useProfile() {
  const userId = useUserId();
  const query = useQuery({
    queryKey: profileKeys.detail(userId ?? 'signed-out'),
    queryFn: () => {
      if (!userId) throw new Error('Not signed in');
      return fetchProfile(userId);
    },
    enabled: !!userId,
  });

  const onboarded = query.data ? query.data.onboarded_at !== null : undefined;
  useEffect(() => {
    if (userId && onboarded !== undefined) writeOnboarded(userId, onboarded);
  }, [userId, onboarded]);

  return query;
}

/** Updates the signed-in user's profile and refreshes the cached copy with the saved row. */
export function useUpdateProfile() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await getSupabase()
        .from('profiles')
        .update(changes)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    // Saving needs the server (it checks usernames and age), so don't queue it while offline.
    networkMode: 'online',
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(profile.id), profile);
    },
  });
}
