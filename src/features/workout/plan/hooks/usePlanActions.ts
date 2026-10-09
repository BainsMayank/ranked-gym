import { useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components';
import {
  editRoutineForDay,
  localDateKey,
  moveDay,
  regenerateSession,
  replaceExercises,
  resumeShift,
  shiftFromMissed,
  skipDay,
  swapInRoutine,
  templateFamily,
  useSavePlan,
  type EditScope,
  type PlanDoc,
  type PlanExercise,
} from '@/lib/plans';
import { loadRoutineDoc, type RoutineDoc } from '@/lib/routines';

import { usePlanEngine } from './usePlanEngine';

/** Plan edits from the card, overview and session screens. Each one is a single local save. */
export function usePlanActions() {
  const save = useSavePlan();
  const { ctx } = usePlanEngine();
  const queryClient = useQueryClient();
  const today = () => localDateKey(new Date());
  const familyOf = (plan: PlanDoc) => (key: string) => templateFamily(plan.settings.input, key);

  const loadRoutines = async (plan: PlanDoc) => {
    const ids = [...new Set(plan.days.map((d) => d.routineId).filter((x): x is string => !!x))];
    const docs = await Promise.all(ids.map((id) => loadRoutineDoc(id)));
    return new Map(docs.filter((d): d is RoutineDoc => !!d).map((d) => [d.id, d]));
  };

  return {
    pending: save.isPending,

    skip: (plan: PlanDoc, dayId: string) =>
      save.mutate({ doc: { ...plan, days: skipDay(plan.days, dayId) } }),

    shiftWeek: (plan: PlanDoc, dayId: string) => {
      const shifted = shiftFromMissed(plan, dayId, today(), familyOf(plan));
      save.mutate({ doc: { ...plan, ...shifted } });
      showToast({ message: 'Moved to today; the rest of the plan follows it.' });
    },

    /** Returns an error message, or a warning when the move puts like sessions back to back. */
    move: (plan: PlanDoc, dayId: string, date: string): { error?: string; warning?: string } => {
      const result = moveDay(plan, dayId, date, today(), familyOf(plan));
      if (!result.ok) return { error: result.reason };
      save.mutate({ doc: { ...plan, days: result.days } });
      return result.warning ? { warning: result.warning } : {};
    },

    pause: (plan: PlanDoc) => save.mutate({ doc: { ...plan, pausedAt: new Date().toISOString() } }),

    resume: (plan: PlanDoc) => {
      if (!plan.pausedAt) return;
      const pausedOn = localDateKey(new Date(plan.pausedAt));
      save.mutate({ doc: { ...plan, ...resumeShift(plan, pausedOn, today()), pausedAt: null } });
    },

    end: (plan: PlanDoc) =>
      save.mutate({
        doc: { ...plan, status: today() > plan.endDate ? 'completed' : 'abandoned' },
      }),

    swap: async (
      plan: PlanDoc,
      dayId: string,
      scope: EditScope,
      from: PlanExercise,
      to: PlanExercise,
    ) => {
      const routines = await loadRoutines(plan);
      const now = new Date().toISOString();
      const { level } = plan.settings.input;
      const edit = editRoutineForDay(
        plan,
        dayId,
        scope,
        routines,
        (r) => swapInRoutine(r, from, to, level, ctx.effort),
        { newId: ctx.newId, now },
      );
      if (!edit) return;
      save.mutate({ doc: edit.plan, routines: edit.routines });
      void queryClient.invalidateQueries({ queryKey: ['routines'] });
    },

    regenerate: async (plan: PlanDoc, dayId: string, scope: EditScope) => {
      const day = plan.days.find((d) => d.id === dayId);
      if (!day) return;
      const fresh = regenerateSession(
        plan.settings.input,
        day.templateKey,
        ctx,
        Date.now() % 100000,
      );
      if (!fresh) return;
      const routines = await loadRoutines(plan);
      const logTypeOf = new Map(ctx.library.map((e) => [e.id, e.logType]));
      const edit = editRoutineForDay(
        plan,
        dayId,
        scope,
        routines,
        replaceExercises(fresh.exercises, (id) => logTypeOf.get(id) ?? 'weight_reps', ctx.newId),
        { newId: ctx.newId, now: new Date().toISOString() },
      );
      if (!edit) return;
      save.mutate({ doc: edit.plan, routines: edit.routines });
      showToast({ message: 'New exercises, same rules.' });
    },
  };
}
