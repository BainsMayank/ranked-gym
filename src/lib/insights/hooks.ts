import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { z } from 'zod';

import { useAuthStore, useUserId } from '@/lib/auth/authStore';
import { getSupabase } from '@/lib/supabase';
import { useSyncStatusStore } from '@/lib/sync/status';

import { rangeFor } from './metrics';
import { emptyAnalytics, loadLocalAnalytics } from './localAnalytics';
import {
  loadLocalGoals,
  localRecoverySpeed,
  saveLocalGoal,
  setLocalRecoverySpeed,
} from './localGoals';
import type { RecoverySpeed } from './recovery';
import { analyticsSchema, goalSchema, type GoalTarget, type GoalType } from './schema';

export const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
const cacheKey = (key: readonly unknown[]) => `insights.v1.${JSON.stringify(key)}`;
function cached<T>(key: readonly unknown[], schema: z.ZodType<T>): T | undefined {
  try {
    const raw = Storage.getItemSync(cacheKey(key));
    return raw ? schema.parse(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
function cache(key: readonly unknown[], data: unknown) {
  try {
    Storage.setItemSync(cacheKey(key), JSON.stringify(data));
  } catch {
    /* Best effort. */
  }
}
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}
function useRefreshOnForeground(refetch: () => Promise<unknown>, enabled: boolean) {
  const online = useSyncStatusStore((s) => s.online);
  useEffect(() => {
    if (online && enabled) void refetch();
  }, [online, refetch, enabled]);
  useEffect(() => {
    const s = AppState.addEventListener('change', (v) => {
      if (v === 'active' && online && enabled) void refetch();
    });
    return () => s.remove();
  }, [online, refetch, enabled]);
}
export function useAnalytics(days = 14, custom?: { start: string; end: string }) {
  const userId = useUserId();
  const preview = useAuthStore((s) => s.preview) && !userId;
  const now = useClock();
  const bounds = custom ?? rangeFor(days, new Date(now));
  const key = ['insights', userId ?? 'signed-out', bounds.start, bounds.end, zone()] as const;
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (preview) {
        const data = await loadLocalAnalytics(
          bounds.start,
          bounds.end,
          zone(),
          localRecoverySpeed(),
        );
        cache(key, data);
        return data;
      }
      const { data, error } = await getSupabase().rpc('get_home_analytics', {
        p_start: bounds.start,
        p_end: bounds.end,
        p_zone: zone(),
      });
      if (error) throw error;
      const parsed = analyticsSchema.parse(data);
      cache(key, parsed);
      return parsed;
    },
    initialData: () =>
      cached(key, analyticsSchema) ??
      (preview ? emptyAnalytics(bounds.start, bounds.end, zone()) : undefined),
    initialDataUpdatedAt: 0,
    enabled: !!userId || preview,
    networkMode: preview ? 'always' : 'online',
    refetchInterval: 5 * 60_000,
  });
  useRefreshOnForeground(query.refetch, !!userId || preview);
  return query;
}
export function useGoals() {
  const userId = useUserId();
  const preview = useAuthStore((s) => s.preview) && !userId;
  const key = ['insights', userId ?? 'signed-out', 'goals'] as const;
  const schema = z.array(goalSchema);
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (preview) return loadLocalGoals();
      const { data, error } = await getSupabase().rpc('get_goals', { p_zone: zone() });
      if (error) throw error;
      const parsed = schema.parse(data);
      cache(key, parsed);
      return parsed;
    },
    initialData: () => (preview ? [] : cached(key, schema)),
    initialDataUpdatedAt: 0,
    enabled: !!userId || preview,
    networkMode: preview ? 'always' : 'online',
    refetchInterval: 60_000,
  });
  useRefreshOnForeground(query.refetch, !!userId || preview);
  return query;
}
export interface GoalInput {
  id: string;
  type: GoalType;
  target: GoalTarget;
  deadline: string | null;
  autoPost: boolean;
  archive?: boolean;
}
export function useSaveGoal() {
  const preview = useAuthStore((s) => s.preview && !s.session);
  const qc = useQueryClient();
  const online = useSyncStatusStore((s) => s.online);
  return useMutation({
    mutationFn: async (g: GoalInput) => {
      if (preview) return saveLocalGoal(g);
      if (!online) throw new Error('Connect to save your goal. Your form stays here.');
      const { error } = await getSupabase().rpc('save_goal', {
        p_id: g.id,
        p_type: g.type,
        p_target: g.target,
        p_deadline: g.deadline ?? undefined,
        p_auto_post: g.autoPost,
        p_archive: g.archive ?? false,
        p_zone: zone(),
      });
      if (error) throw error;
    },
    networkMode: 'always',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}
export function useRecoverySpeed() {
  const preview = useAuthStore((s) => s.preview && !s.session);
  const userId = useUserId();
  const qc = useQueryClient();
  const online = useSyncStatusStore((s) => s.online);
  return useMutation({
    mutationFn: async (speed: RecoverySpeed) => {
      if (preview) {
        setLocalRecoverySpeed(speed);
        return;
      }
      if (!userId || !online) throw new Error('Connect to change recovery speed.');
      const { error } = await getSupabase()
        .from('user_settings')
        .update({ recovery_speed: speed })
        .eq('user_id', userId);
      if (error) throw error;
    },
    networkMode: 'always',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insights'] }),
  });
}
