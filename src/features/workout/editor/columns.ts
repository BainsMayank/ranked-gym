import type { LogType } from '@/lib/exercises';
import {
  defaultWeightMode,
  formatDistanceKm,
  formatDuration,
  formatLoad,
  formatRepsTarget,
  parseDistanceInput,
  parseDurationInput,
  parseLoadInput,
  parseRepsInput,
  parseRirInput,
  parseRpeInput,
  topSetBefore,
  type EffortMetric,
  type RoutineSet,
} from '@/lib/routines';
import type { WeightUnit } from '@/lib/units';

/**
 * Which cells a set row shows. They follow the exercise's log type (weight × reps, bodyweight,
 * time, distance) and the user's effort metric (RIR, RPE or both).
 */
export type Column = 'load' | 'reps' | 'time' | 'distance' | 'rir' | 'rpe';

export function columnsFor(
  logType: LogType,
  effort: EffortMetric,
  distanceTarget: 'distance' | 'duration',
): Column[] {
  const effortCols: Column[] =
    effort === 'both' ? ['rir', 'rpe'] : effort === 'rpe' ? ['rpe'] : ['rir'];
  switch (logType) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      return ['load', 'reps', ...effortCols];
    case 'bodyweight_reps':
      return ['reps', ...effortCols];
    case 'duration':
      // RIR means little for a hold; RPE still does.
      return ['time', ...effortCols.filter((c) => c === 'rpe')];
    case 'distance_duration':
      return [
        distanceTarget === 'distance' ? 'distance' : 'time',
        ...effortCols.filter((c) => c === 'rpe'),
      ];
  }
}

export function columnHeader(column: Column, logType: LogType, unit: WeightUnit): string {
  switch (column) {
    case 'load':
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

export function cellText(column: Column, set: RoutineSet, unit: WeightUnit): string {
  switch (column) {
    case 'load':
      return formatLoad(set, unit);
    case 'reps':
      return formatRepsTarget(set);
    case 'time':
      return set.durationSec === null ? '' : formatDuration(set.durationSec);
    case 'distance':
      return set.distanceM === null ? '' : formatDistanceKm(set.distanceM);
    case 'rir':
      return set.rir === null ? '' : String(set.rir);
    case 'rpe':
      return set.rpe === null ? '' : String(set.rpe);
  }
}

/** The patch for typed text, or null when it isn't valid for this cell. */
export function parseCell(
  column: Column,
  text: string,
  ctx: {
    set: RoutineSet;
    sets: readonly RoutineSet[];
    index: number;
    logType: LogType;
    unit: WeightUnit;
  },
): Partial<RoutineSet> | null {
  switch (column) {
    case 'load': {
      const load = parseLoadInput(text, ctx.unit);
      if (!load) return null;
      const plain = defaultWeightMode(ctx.logType);
      if (load.kind === 'empty') return { weightMode: plain, weightKg: null, weightPercent: null };
      if (load.kind === 'weight')
        return { weightMode: plain, weightKg: load.kg, weightPercent: null };
      // Percentages need a bar weight to be a percentage of.
      if (plain !== 'absolute') return null;
      const ofTop =
        ctx.set.weightMode === 'percent_of_top_set' ||
        (['backoff', 'drop'].includes(ctx.set.setType) && !!topSetBefore(ctx.sets, ctx.index));
      return {
        weightMode: ofTop ? 'percent_of_top_set' : 'percent_of_1rm',
        weightPercent: load.percent,
        weightKg: null,
      };
    }
    case 'reps':
      return parseRepsInput(text);
    case 'time': {
      const sec = parseDurationInput(text);
      return sec === null ? null : { targetType: 'duration', durationSec: sec };
    }
    case 'distance': {
      const m = parseDistanceInput(text);
      return m === null ? null : { targetType: 'distance', distanceM: m };
    }
    case 'rir': {
      const rir = parseRirInput(text);
      return rir === undefined ? null : { rir };
    }
    case 'rpe': {
      const rpe = parseRpeInput(text);
      return rpe === undefined ? null : { rpe };
    }
  }
}

/** Distance-and-time exercises target one of the two; the first set decides for the card. */
export function distanceTargetOf(sets: readonly RoutineSet[]): 'distance' | 'duration' {
  return sets[0]?.targetType === 'duration' ? 'duration' : 'distance';
}
