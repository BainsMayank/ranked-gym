import type { LogType } from '@/lib/exercises';
import { formatDistanceKm, formatDuration, type EffortMetric } from '@/lib/routines';
import { fromKg, toKg, type WeightUnit } from '@/lib/units';
import type { Suggestion, WorkoutSet } from '@/lib/workouts';

import type { KeypadField } from './store';

/**
 * The cells a logged set shows and how the keypad edits them. Values are stored canonically (kg,
 * seconds, metres); the keypad works in what the lifter sees (kg or lb, m:ss, km).
 */

/** Cells per log type: load and reps, or time and distance, plus one effort column. */
export function logFieldsFor(logType: LogType, effort: EffortMetric): KeypadField[] {
  const effortField: KeypadField = effort === 'rir' ? 'rir' : 'rpe';
  switch (logType) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      return ['weight', 'reps', effortField];
    case 'bodyweight_reps':
      return ['reps', effortField];
    case 'duration':
      return ['time'];
    case 'distance_duration':
      return ['distance', 'time'];
  }
}

export function fieldHeader(field: KeypadField, logType: LogType, unit: WeightUnit): string {
  switch (field) {
    case 'weight':
      if (logType === 'weighted_bodyweight') return `+${unit}`;
      if (logType === 'assisted_bodyweight') return `−${unit}`;
      return unit;
    case 'reps':
      return 'Reps';
    case 'time':
      return 'Time';
    case 'distance':
      return 'km';
    case 'rir':
      return 'RIR';
    case 'rpe':
      return 'RPE';
  }
}

/** Long name for screen readers and the keypad header. */
export const fieldNames: Record<KeypadField, string> = {
  weight: 'Weight',
  reps: 'Reps',
  time: 'Time',
  distance: 'Distance',
  rir: 'Reps in reserve',
  rpe: 'RPE',
};

/** The stored value of a field (kg, reps, seconds, metres, RIR, RPE). */
export function valueOf(set: WorkoutSet, field: KeypadField): number | null {
  switch (field) {
    case 'weight':
      return set.weightKg;
    case 'reps':
      return set.reps;
    case 'time':
      return set.durationSec;
    case 'distance':
      return set.distanceM;
    case 'rir':
      return set.rir;
    case 'rpe':
      return set.rpe;
  }
}

/** What an empty cell suggests (target, else last time). */
export function suggestedValue(s: Suggestion, field: KeypadField, set: WorkoutSet): number | null {
  switch (field) {
    case 'weight':
      return s.weightKg;
    case 'reps':
      return s.reps;
    case 'time':
      return s.durationSec;
    case 'distance':
      return s.distanceM;
    case 'rir':
      return set.targetRir;
    case 'rpe':
      return set.targetRpe;
  }
}

function trimNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}

/** A stored value as the lifter reads it ("102.5", "8", "1:30", "2.4"). */
export function formatField(field: KeypadField, value: number | null, unit: WeightUnit): string {
  if (value === null) return '';
  switch (field) {
    case 'weight':
      return trimNumber(fromKg(value, unit, 0.01));
    case 'time':
      return formatDuration(value);
    case 'distance':
      return formatDistanceKm(value);
    default:
      return trimNumber(value);
  }
}

/** Starting text when the keypad opens on a cell. Time is typed as digits (130 = 1:30). */
export function draftFor(field: KeypadField, value: number | null, unit: WeightUnit): string {
  if (value === null) return '';
  if (field === 'time') {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return m > 0 ? `${m}${String(s).padStart(2, '0')}` : String(s);
  }
  return formatField(field, value, unit);
}

/**
 * Typed text to a stored value: null for empty, undefined when it isn't valid for the cell.
 * Weight is in the user's unit; time digits are read as m:ss.
 */
export function parseDraft(
  field: KeypadField,
  draft: string,
  unit: WeightUnit,
): number | null | undefined {
  const text = draft.trim();
  if (text === '' || text === '.') return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return undefined;
  switch (field) {
    case 'weight': {
      const kg = toKg(n, unit);
      return kg <= 1000 ? kg : undefined;
    }
    case 'reps':
      return Number.isInteger(n) && n <= 500 ? n : undefined;
    case 'time': {
      if (!/^\d+$/.test(text)) return undefined;
      const digits = text.padStart(3, '0');
      const sec = Number(digits.slice(-2));
      const min = Number(digits.slice(0, -2));
      return sec < 60 ? min * 60 + sec : undefined;
    }
    case 'distance': {
      const m = Math.round(n * 1000);
      return m <= 1_000_000 ? m : undefined;
    }
    case 'rir':
      return Number.isInteger(n) && n <= 10 ? n : undefined;
    case 'rpe':
      return n >= 1 && n <= 10 && Number.isInteger(n * 2) ? n : undefined;
  }
}

export function patchFor(field: KeypadField, value: number | null): Partial<WorkoutSet> {
  switch (field) {
    case 'weight':
      return { weightKg: value };
    case 'reps':
      return { reps: value };
    case 'time':
      return { durationSec: value };
    case 'distance':
      return { distanceM: value };
    case 'rir':
      return { rir: value };
    case 'rpe':
      return { rpe: value };
  }
}

/** The +/- step in display units: 2.5 kg, 5 lb, 1 rep, 15 s, 0.1 km, 1 RIR, 0.5 RPE. */
export function stepFor(field: KeypadField, unit: WeightUnit): number {
  switch (field) {
    case 'weight':
      return unit === 'kg' ? 2.5 : 5;
    case 'time':
      return 15;
    case 'distance':
      return 0.1;
    case 'rpe':
      return 0.5;
    default:
      return 1;
  }
}

/**
 * Applies a +/- step to the draft (or, when empty, the suggestion) and returns the new draft.
 * Never goes below zero; RPE stays within 1–10.
 */
export function stepDraft(
  field: KeypadField,
  draft: string,
  fallback: number | null,
  direction: 1 | -1,
  unit: WeightUnit,
): string {
  const current = parseDraft(field, draft, unit);
  const base = current === undefined || current === null ? fallback : current;
  const step = stepFor(field, unit);
  if (field === 'time') {
    const next = Math.max(0, (base ?? 0) + direction * step);
    return draftFor('time', next, unit);
  }
  if (field === 'distance') {
    const km = Math.max(0, (base ?? 0) / 1000 + direction * step);
    return trimNumber(km);
  }
  if (field === 'weight') {
    const shown = base === null ? 0 : fromKg(base, unit, 0.01);
    return trimNumber(Math.max(0, shown + direction * step));
  }
  let next = Math.max(0, (base ?? 0) + direction * step);
  if (field === 'rpe') next = Math.min(10, Math.max(1, next));
  return trimNumber(next);
}

/** Appends a key to the draft, keeping it sensible (one dot, no dot for whole-number cells). */
export function typeKey(field: KeypadField, draft: string, key: string): string {
  if (key === 'back') return draft.slice(0, -1);
  const wholeOnly = field === 'reps' || field === 'rir' || field === 'time';
  if (key === '.') {
    if (wholeOnly || draft.includes('.')) return draft;
    return draft === '' ? '0.' : `${draft}.`;
  }
  const decimals = draft.split('.')[1];
  if (decimals !== undefined && decimals.length >= 2) return draft;
  if (draft.replace('.', '').length >= 6) return draft;
  return draft === '0' ? key : draft + key;
}
