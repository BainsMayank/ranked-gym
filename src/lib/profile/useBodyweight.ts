import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';

import { useAuthStore, useUserId } from '@/lib/auth/authStore';
import { randomUUID } from 'expo-crypto';
import { localBodyweight, saveLocalBodyweight } from '@/lib/insights/localBodyweight';
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
  if (userId === 'device-preview') return localBodyweight().at(-1)?.kg ?? null;
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
  const preview = useAuthStore((s) => s.preview && !s.session);
  return useQuery({
    queryKey: [...profileKeys.bodyweight(userId ?? 'signed-out'), limit],
    queryFn: async () => {
      if (preview)
        return localBodyweight()
          .slice(-limit)
          .reverse()
          .map((p) => ({
            id: p.id,
            user_id: 'device-preview',
            weight_kg: p.kg,
            logged_at: p.at,
            created_at: p.at,
          }));
      const { data, error } = await getSupabase()
        .from('bodyweight_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      if (userId && data[0]) writeCachedBodyweight(userId, Number(data[0].weight_kg));
      return data;
    },
    enabled: !!userId || preview,
    networkMode: preview ? 'always' : 'online',
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
  const preview = useAuthStore((s) => s.preview && !s.session);
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ weightKg, replaceId }: { weightKg: number; replaceId?: string }) => {
      if (preview) {
        const p = saveLocalBodyweight(replaceId ?? randomUUID(), weightKg, !!replaceId);
        return {
          id: p.id,
          user_id: 'device-preview',
          weight_kg: p.kg,
          logged_at: p.at,
          created_at: p.at,
        };
      }
      const table = getSupabase().from('bodyweight_logs');
      const { data, error } = replaceId
        ? await table.update({ weight_kg: weightKg }).eq('id', replaceId).select('*').single()
        : await table.insert({ weight_kg: weightKg }).select('*').single();
      if (error) throw error;
      if (userId && !replaceId) writeCachedBodyweight(userId, Number(data.weight_kg));
      return data;
    },
    networkMode: preview ? 'always' : 'online',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['insights'] });
      void queryClient.invalidateQueries({
        queryKey: profileKeys.bodyweight(userId ?? 'signed-out'),
      });
    },
  });
}
