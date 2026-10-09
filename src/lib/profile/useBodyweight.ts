import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';

import { useUserId } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { profileKeys } from './keys';

export type BodyweightLog = Database['public']['Tables']['bodyweight_logs']['Row'];

const cacheKey = (userId: string) => `latest-bodyweight.${userId}`;

/**
 * The latest weigh-in seen on this device (kg), so a workout started offline still snapshots the
 * bodyweight for its calorie estimate.
 */
export function readCachedBodyweight(userId: string): number | null {
  try {
    const raw = Storage.getItemSync(cacheKey(userId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedBodyweight(userId: string, kg: number): void {
  try {
    Storage.setItemSync(cacheKey(userId), String(kg));
  } catch {
    // Only an optimisation.
  }
}

/** Recent weigh-ins, newest first (kg). */
export function useBodyweightLogs(limit = 30) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...profileKeys.bodyweight(userId ?? 'signed-out'), limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('bodyweight_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (userId && data[0]) writeCachedBodyweight(userId, Number(data[0].weight_kg));
      return data;
    },
    enabled: !!userId,
  });
}

export function useLatestBodyweight() {
  const query = useBodyweightLogs(1);
  return { ...query, data: query.data?.[0] ?? null };
}

/**
 * Logs a weigh-in in kg. Pass `replaceId` to correct an existing entry instead (onboarding does this
 * when someone goes back and changes their weight, so it never logs twice).
 */
export function useLogBodyweight() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ weightKg, replaceId }: { weightKg: number; replaceId?: string }) => {
      const table = getSupabase().from('bodyweight_logs');
      const { data, error } = replaceId
        ? await table.update({ weight_kg: weightKg }).eq('id', replaceId).select('*').single()
        : await table.insert({ weight_kg: weightKg }).select('*').single();
      if (error) throw error;
      if (userId && !replaceId) writeCachedBodyweight(userId, Number(data.weight_kg));
      return data;
    },
    networkMode: 'online',
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: profileKeys.bodyweight(userId) });
    },
  });
}
