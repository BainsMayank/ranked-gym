import { fromKg, roundTo, toKg, type WeightUnit } from '@/lib/units';

import { ROUTINE_LIMITS } from './taxonomy';
import type { RoutineSet } from './types';

/**
 * Set-table cells are free text so one field can hold "8" or "8-10", "60" or "85%". Each parser
 * returns the set fields to change, or null when the text isn't valid (the cell then reverts).
 */

type SetPatch = Partial<RoutineSet>;

const RANGE = /^(\d{1,3})\s*(?:-|–|—|to)\s*(\d{1,3})$/i;

/** "8" → reps; "8-10", "8–10", "8 to 10" → rep range (swapped if reversed; equal → reps). */
export function parseRepsInput(text: string): SetPatch | null {
  const t = text.trim();
  const single = /^\d{1,3}$/.test(t) ? Number(t) : null;
  if (single !== null) {
    if (single < 1 || single > ROUTINE_LIMITS.repsMax) return null;
    return { targetType: 'reps', reps: single, repsMin: null, repsMax: null };
  }
  const m = RANGE.exec(t);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (lo < 1 || hi > ROUTINE_LIMITS.repsMax) return null;
  if (lo === hi) return { targetType: 'reps', reps: lo, repsMin: null, repsMax: null };
  return { targetType: 'rep_range', reps: null, repsMin: lo, repsMax: hi };
}

/** "45", "0:45", "1:30", "90s", "2m" → seconds. */
export function parseDurationInput(text: string): number | null {
  const t = text.trim().toLowerCase();
  let sec: number | null = null;
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(t);
  if (clock) sec = Number(clock[1]) * 60 + Number(clock[2]);
  else if (/^\d{1,4}s?$/.test(t)) sec = Number(t.replace('s', ''));
  else if (/^\d{1,3}(\.\d)?m$/.test(t)) sec = Math.round(Number(t.slice(0, -1)) * 60);
  if (sec === null || sec < 1 || sec > ROUTINE_LIMITS.durationMaxSec) return null;
  return sec;
}

/** 45 → "0:45", 90 → "1:30". */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Rest chip text: 0 → "No rest", 90 → "1:30", 120 → "2:00". */
export function formatRest(sec: number): string {
  return sec === 0 ? 'No rest' : formatDuration(sec);
}

/** Kilometres as typed ("0.4", "5") → metres. */
export function parseDistanceInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(t)) return null;
  const m = Math.round(Number(t) * 1000);
  if (m < 1 || m > ROUTINE_LIMITS.distanceMaxM) return null;
  return m;
}

export function formatDistanceKm(m: number): string {
  return String(roundTo(m / 1000, 0.01));
}

export type LoadInput =
  { kind: 'empty' } | { kind: 'weight'; kg: number } | { kind: 'percent'; percent: number };

/** "60" (in the user's unit) → kg; "85%" → percent; "" → empty. */
export function parseLoadInput(text: string, unit: WeightUnit): LoadInput | null {
  const t = text
    .trim()
    .replace(',', '.')
    .replace(/^[+−-]/, '');
  if (t === '') return { kind: 'empty' };
  const pct = /^(\d{1,3}(\.\d)?)\s*%$/.exec(t);
  if (pct) {
    const percent = Number(pct[1]);
    return percent >= 1 && percent <= ROUTINE_LIMITS.percentMax
      ? { kind: 'percent', percent }
      : null;
  }
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(t)) return null;
  const kg = toKg(Number(t), unit);
  return kg <= ROUTINE_LIMITS.weightMaxKg ? { kind: 'weight', kg } : null;
}

/** RIR 0–5 (whole numbers). */
export function parseRirInput(text: string): number | null | undefined {
  const t = text.trim();
  if (t === '') return null;
  if (!/^[0-5]$/.test(t)) return undefined;
  return Number(t);
}

/** RPE 5–10 in 0.5 steps. */
export function parseRpeInput(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^\d{1,2}(\.\d)?$/.test(t)) return undefined;
  const v = Number(t);
  if (v < 5 || v > 10 || !Number.isInteger(v * 2)) return undefined;
  return v;
}

export const TEMPO_PATTERN = /^[0-9X]-[0-9X]-[0-9X]-[0-9X]$/;

/** "3110" or "3-1-1-0" → "3-1-1-0"; "" → null; anything else invalid. */
export function parseTempoInput(text: string): string | null | undefined {
  const t = text.trim().toUpperCase().replace(/\s/g, '');
  if (t === '') return null;
  const dashed = /^[0-9X]{4}$/.test(t) ? t.split('').join('-') : t;
  return TEMPO_PATTERN.test(dashed) ? dashed : undefined;
}

/** Reps cell text: "8" or "8–10" ('' for timed sets). */
export function formatRepsTarget(set: RoutineSet): string {
  if (set.targetType === 'reps') return set.reps === null ? '' : String(set.reps);
  if (set.targetType === 'rep_range') return `${set.repsMin ?? ''}–${set.repsMax ?? ''}`;
  return '';
}

/** Load cell text in the user's unit: "60", "85%", '' when unset. */
export function formatLoad(set: RoutineSet, unit: WeightUnit): string {
  if (set.weightMode === 'percent_of_1rm' || set.weightMode === 'percent_of_top_set') {
    return set.weightPercent === null ? '' : `${set.weightPercent}%`;
  }
  return set.weightKg === null || set.weightKg === 0 ? '' : String(fromKg(set.weightKg, unit));
}
