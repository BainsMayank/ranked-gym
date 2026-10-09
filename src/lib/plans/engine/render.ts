import { estimateDurationSec } from '@/lib/routines/duration';
import type { RoutineExercise, RoutineSet } from '@/lib/routines/types';

import { weekdayShort } from './schedule';
import type { GeneratedPlan, PlanExercise } from './types';
import { groupLabels } from './volume';

/**
 * A plan as plain text: the snapshot tests use it, and so does docs/PLAN_ENGINE.md. One line per
 * exercise: name, sets × target, rest, effort and progression.
 */

function target(s: RoutineSet): string {
  if (s.targetType === 'duration') return `${s.durationSec}s`;
  if (s.targetType === 'distance') return `${s.distanceM}m`;
  if (s.targetType === 'reps') return String(s.reps);
  return `${s.repsMin}-${s.repsMax}`;
}

function setsText(e: RoutineExercise): string {
  const parts: string[] = [];
  const working = e.sets.filter((s) => s.setType !== 'warmup');
  const warm = e.sets.length - working.length;
  if (warm) parts.push(`${warm}W`);
  const groups: { label: string; n: number }[] = [];
  for (const s of working) {
    const kind = s.setType === 'working' ? '' : `${s.setType} `;
    const pct = s.weightPercent ? ` @${s.weightPercent}%` : '';
    const label = `${kind}${target(s)}${pct}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.n += 1;
    else groups.push({ label, n: 1 });
  }
  parts.push(...groups.map((g) => `${g.n}×${g.label}`));
  const effort = working[0]?.rir;
  return `${parts.join(' + ')}${effort !== null && effort !== undefined ? ` RIR ${effort}` : ''}`;
}

export function renderExercises(
  exercises: readonly RoutineExercise[],
  names: ReadonlyMap<string, string>,
): string[] {
  return exercises.map((e) => {
    const ss = e.supersetGroup ? ` [superset ${e.supersetGroup}]` : '';
    const rule = (e.progressionRule as { kind?: string } | null)?.kind ?? '-';
    return `  - ${names.get(e.exerciseId) ?? e.exerciseId}: ${setsText(e)}, rest ${e.restAfterSupersetSeconds ?? e.restSeconds}s${ss} (${rule})`;
  });
}

export function renderPlan(plan: GeneratedPlan, library: readonly PlanExercise[]): string {
  const names = new Map(library.map((e) => [e.id, e.name]));
  const lines = [
    `${plan.name} — ${plan.splitLabel}`,
    `Week: ${plan.week.map((d) => `${weekdayShort[d.weekday]} ${plan.sessions.find((s) => s.key === d.key)!.label}`).join(' · ')}`,
  ];
  for (const s of plan.sessions) {
    const min = Math.round(estimateDurationSec(s.routine.exercises) / 60);
    lines.push(`${s.label} (~${min} min)`);
    lines.push(...renderExercises(s.routine.exercises, names));
  }
  lines.push(
    `Weekly sets: ${plan.volume
      .map((v) => `${groupLabels[v.group]} ${v.sets}${v.role === 'focus' ? '*' : ''}`)
      .join(', ')}`,
  );
  const short = plan.volume.filter((v) => v.shortfall);
  if (short.length) {
    lines.push(
      `Short: ${short.map((v) => `${groupLabels[v.group]} — ${v.shortfall}`).join(' | ')}`,
    );
  }
  return lines.join('\n');
}
