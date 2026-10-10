import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useExercises, type Exercise } from '@/lib/exercises';
import { useProfile, useTrainingSettings } from '@/lib/profile';
import {
  blankRoutine,
  deleteDraft,
  estimateDurationMin,
  loadDraft,
  saveDraft,
  useRoutineDoc,
  useSaveRoutine,
  validateRoutineDoc,
  type RoutineDoc,
} from '@/lib/routines';

import type { EditorEnv } from './EditorEnv';
import { selectDirty, useRoutineEditor } from './store';

const AUTOSAVE_MS = 800;

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * Loads a routine into the editor store (restoring an unsaved draft if there is one), autosaves
 * the working copy to SQLite while it has changes, and saves it. `id === 'new'` starts a blank one.
 */
export function useEditorSession(routeId: string | undefined) {
  const isNew = !routeId || routeId === 'new';
  const [newId] = useState(() => randomUUID());
  const id = isNew ? newId : routeId;
  const saved = useRoutineDoc(isNew ? undefined : id);
  const { data: library } = useExercises();
  const { data: profile } = useProfile();
  const settings = useTrainingSettings();
  const saveRoutine = useSaveRoutine();
  const [restored, setRestored] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const doc = useRoutineEditor((s) => s.doc);
  const dirty = useRoutineEditor(selectDirty);

  // Load the saved copy (or a blank one), then a newer draft on top. Reload when the saved copy
  // changes underneath (a sync brought it in or updated it), unless there are unsaved edits.
  const savedDoc = saved.data;
  const ready = isNew || saved.isFetched;
  useEffect(() => {
    const key = `${id}:${savedDoc?.updatedAt ?? 'none'}`;
    if (!ready || loadedFor.current === key) return;
    if (loadedFor.current?.startsWith(`${id}:`) && selectDirty(useRoutineEditor.getState())) return;
    loadedFor.current = key;
    const base = savedDoc ?? blankRoutine(id, new Date().toISOString());
    let cancelled = false;
    void loadDraft(id).then((draft) => {
      if (cancelled) return;
      const newer = draft && (!savedDoc || draft.updatedAt > Date.parse(savedDoc.updatedAt));
      useRoutineEditor.getState().load(newer ? draft.doc : base, base);
      setRestored(!!newer);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, id, savedDoc]);

  useEffect(() => () => useRoutineEditor.getState().reset(), []);

  // Autosave the working copy while it differs from the saved routine.
  useEffect(() => {
    if (!doc || !dirty) return;
    const t = setTimeout(() => void saveDraft(doc).catch(() => undefined), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [doc, dirty]);

  const env = useMemo<EditorEnv>(
    () => ({
      exercises: new Map((library ?? []).map((e: Exercise) => [e.id, e])),
      unit: profile?.units ?? 'kg',
      effort: settings.effort_metric,
      barKg: settings.bar_weight_kg,
      defaultRestSec: settings.rest_timer_default_sec,
    }),
    [
      library,
      profile?.units,
      settings.effort_metric,
      settings.bar_weight_kg,
      settings.rest_timer_default_sec,
    ],
  );

  async function save(): Promise<SaveResult> {
    const current = useRoutineEditor.getState().doc;
    if (!current) return { ok: false, message: 'Still loading.' };
    const next: RoutineDoc = {
      ...current,
      name: current.name.trim(),
      description: current.description?.trim() || null,
      estimatedDurationMin: estimateDurationMin(current.exercises),
      updatedAt: new Date().toISOString(),
    };
    const check = validateRoutineDoc(next);
    if (!check.ok) return check;
    await saveRoutine.mutateAsync(next);
    useRoutineEditor.getState().markSaved(next);
    setRestored(false);
    return { ok: true };
  }

  async function discard(): Promise<void> {
    await deleteDraft(id);
    const { baseline } = useRoutineEditor.getState();
    if (baseline) useRoutineEditor.getState().markSaved(baseline);
    setRestored(false);
  }

  return {
    id,
    isNew,
    /** Never saved, but opened from a draft (a copied workout). */
    draftOnly: !isNew && saved.isFetched && !saved.data && restored,
    loading: !doc,
    notFound: !isNew && saved.isFetched && !saved.data && !restored,
    restored,
    env,
    save,
    discard,
    saving: saveRoutine.isPending,
  };
}
