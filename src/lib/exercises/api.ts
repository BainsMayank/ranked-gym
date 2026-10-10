import { randomUUID } from 'expo-crypto';

import { readAllRows } from '@/lib/pagination';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import type { Equipment, LogType, Muscle } from './taxonomy';
import type { Exercise } from './types';

/** Everything the app mirrors locally, with the muscles embedded. */
const EXERCISE_COLUMNS =
  'id, slug, name, aliases, category, equipment, mechanic, log_type, unilateral, instructions, ' +
  'tips, common_mistakes, media_url, met_value, is_rankable, rank_key, created_by, updated_at, ' +
  'exercise_muscles (muscle, role, weight)';

type ExerciseRow = Database['public']['Tables']['exercises']['Row'] & {
  exercise_muscles: Pick<
    Database['public']['Tables']['exercise_muscles']['Row'],
    'muscle' | 'role' | 'weight'
  >[];
};

export function exerciseFromRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases,
    category: row.category,
    equipment: row.equipment,
    mechanic: row.mechanic,
    logType: row.log_type,
    unilateral: row.unilateral,
    instructions: row.instructions,
    tips: row.tips,
    commonMistakes: row.common_mistakes,
    mediaUrl: row.media_url,
    metValue: Number(row.met_value),
    isRankable: row.is_rankable,
    rankKey: row.rank_key,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    muscles: row.exercise_muscles.map((m) => ({
      muscle: m.muscle,
      role: m.role,
      weight: Number(m.weight),
    })),
  };
}

/** The official library version on the server (bumped by each library migration). */
export async function fetchLibraryVersion(): Promise<number> {
  const { data, error } = await getSupabase()
    .from('exercise_library_meta')
    .select('version')
    .single();
  if (error) throw error;
  return data.version;
}

export async function fetchOfficialExercises(): Promise<Exercise[]> {
  const data = await readAllRows((from, to) =>
    getSupabase()
      .from('exercises')
      .select(EXERCISE_COLUMNS, { count: 'exact' })
      .is('created_by', null)
      .order('id')
      .range(from, to)
      .returns<ExerciseRow[]>(),
  );
  return data.map(exerciseFromRow);
}

export async function fetchCustomExercises(userId: string): Promise<Exercise[]> {
  const data = await readAllRows((from, to) =>
    getSupabase()
      .from('exercises')
      .select(EXERCISE_COLUMNS, { count: 'exact' })
      .eq('created_by', userId)
      .order('id')
      .range(from, to)
      .returns<ExerciseRow[]>(),
  );
  return data.map(exerciseFromRow);
}

export interface CustomExerciseInput {
  /** Omit to create; pass to edit. */
  id?: string;
  name: string;
  equipment: Equipment;
  logType: LogType;
  primary: Muscle[];
  secondary: Muscle[];
}

/** Creates or edits a custom exercise (one transaction on the server) and returns the saved row. */
export async function saveCustomExercise(input: CustomExerciseInput): Promise<Exercise> {
  const supabase = getSupabase();
  const { data: id, error } = await supabase.rpc('save_custom_exercise', {
    // A client id keeps a retried create idempotent (and lets offline creation queue it later).
    p_id: input.id ?? randomUUID(),
    p_name: input.name,
    p_equipment: input.equipment,
    p_log_type: input.logType,
    p_primary: input.primary,
    p_secondary: input.secondary,
  });
  if (error) throw error;

  const { data, error: readError } = await supabase
    .from('exercises')
    .select(EXERCISE_COLUMNS)
    .eq('id', id)
    .returns<ExerciseRow[]>()
    .single();
  if (readError) throw readError;
  return exerciseFromRow(data);
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const { error } = await getSupabase().from('exercises').delete().eq('id', id);
  if (error) throw error;
}
