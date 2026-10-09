import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Storage } from 'expo-sqlite/kv-store';

import { useUserId } from '@/lib/auth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PlateStock } from '@/lib/workouts/plates';
import type { Database, Json } from '@/types/database';

import { profileKeys } from './keys';

type SettingsRow = Database['public']['Tables']['user_settings']['Row'];

/** The settings the training screens need, cached on the device so they work offline. */
export type TrainingSettings = Pick<
  SettingsRow,
  'effort_metric' | 'rest_timer_default_sec' | 'bar_weight_kg'
> & {
  /** Plates owned, in kg ({ weight_kg, pairs }), for the plate calculator. */
  plate_inventory: PlateStock[];
};

export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = {
  effort_metric: 'rir',
  rest_timer_default_sec: 120,
  bar_weight_kg: 20,
  plate_inventory: [],
};

const COLUMNS = 'effort_metric, rest_timer_default_sec, bar_weight_kg, plate_inventory';

/** The jsonb column as typed plates (anything malformed is dropped). */
export function parsePlateInventory(value: Json): PlateStock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const weight = Number(item.weight_kg);
    const pairs = Number(item.pairs);
    return weight > 0 && pairs > 0 ? [{ weight_kg: weight, pairs: Math.floor(pairs) }] : [];
  });
}

function fromRow(
  row: Pick<
    SettingsRow,
    'effort_metric' | 'rest_timer_default_sec' | 'bar_weight_kg' | 'plate_inventory'
  >,
): TrainingSettings {
  return {
    effort_metric: row.effort_metric,
    rest_timer_default_sec: row.rest_timer_default_sec,
    bar_weight_kg: Number(row.bar_weight_kg),
    plate_inventory: parsePlateInventory(row.plate_inventory),
  };
}

const cacheKey = (userId: string) => `training-settings.${userId}`;

function readCache(userId: string): TrainingSettings | undefined {
  try {
    const raw = Storage.getItemSync(cacheKey(userId));
    return raw
      ? { ...DEFAULT_TRAINING_SETTINGS, ...(JSON.parse(raw) as TrainingSettings) }
      : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(userId: string, settings: TrainingSettings): void {
  try {
    Storage.setItemSync(cacheKey(userId), JSON.stringify(settings));
  } catch {
    // Only an optimisation.
  }
}

/** Effort metric, default rest and bar weight. Falls back to the cached copy, then defaults. */
export function useTrainingSettings(): TrainingSettings {
  const userId = useUserId();
  const { data } = useQuery({
    queryKey: profileKeys.settings(userId ?? 'signed-out'),
    queryFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { data: row, error } = await getSupabase()
        .from('user_settings')
        .select(COLUMNS)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      const settings = fromRow(row);
      writeCache(userId, settings);
      return settings;
    },
    initialData: () => (userId ? readCache(userId) : undefined),
    initialDataUpdatedAt: 0,
    enabled: !!userId && isSupabaseConfigured(),
  });
  return data ?? DEFAULT_TRAINING_SETTINGS;
}

export function useUpdateTrainingSettings() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<TrainingSettings>) => {
      if (!userId) throw new Error('Not signed in');
      const { plate_inventory, ...rest } = changes;
      const { data, error } = await getSupabase()
        .from('user_settings')
        .update(
          plate_inventory
            ? {
                ...rest,
                plate_inventory: plate_inventory.map((p) => ({
                  weight_kg: p.weight_kg,
                  pairs: p.pairs,
                })),
              }
            : rest,
        )
        .eq('user_id', userId)
        .select(COLUMNS)
        .single();
      if (error) throw error;
      return fromRow(data);
    },
    networkMode: 'online',
    onSuccess: (settings) => {
      if (!userId) return;
      writeCache(userId, settings);
      queryClient.setQueryData(profileKeys.settings(userId), settings);
    },
  });
}
