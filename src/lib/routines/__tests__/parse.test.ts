import { set } from '../__fixtures__/routine';
import {
  formatDuration,
  formatLoad,
  formatRepsTarget,
  parseDistanceInput,
  parseDurationInput,
  parseLoadInput,
  parseRepsInput,
  parseRirInput,
  parseRpeInput,
  parseTempoInput,
} from '../parse';

describe('set cell parsing', () => {
  it('reads reps and rep ranges', () => {
    expect(parseRepsInput('8')).toMatchObject({ targetType: 'reps', reps: 8 });
    expect(parseRepsInput('8-10')).toMatchObject({
      targetType: 'rep_range',
      repsMin: 8,
      repsMax: 10,
    });
    expect(parseRepsInput('8–10')).toMatchObject({ repsMin: 8, repsMax: 10 });
    expect(parseRepsInput('12 to 8')).toMatchObject({ repsMin: 8, repsMax: 12 });
    expect(parseRepsInput('6-6')).toMatchObject({ targetType: 'reps', reps: 6 });
    expect(parseRepsInput('0')).toBeNull();
    expect(parseRepsInput('abc')).toBeNull();
    expect(parseRepsInput('8-200')).toBeNull();
  });

  it('reads times', () => {
    expect(parseDurationInput('45')).toBe(45);
    expect(parseDurationInput('0:45')).toBe(45);
    expect(parseDurationInput('1:30')).toBe(90);
    expect(parseDurationInput('90s')).toBe(90);
    expect(parseDurationInput('2m')).toBe(120);
    expect(parseDurationInput('1:75')).toBeNull();
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(150)).toBe('2:30');
  });

  it('reads loads in the user unit or as a percentage', () => {
    expect(parseLoadInput('60', 'kg')).toEqual({ kind: 'weight', kg: 60 });
    expect(parseLoadInput('135', 'lb')).toEqual({ kind: 'weight', kg: 61.23 });
    expect(parseLoadInput('85%', 'kg')).toEqual({ kind: 'percent', percent: 85 });
    expect(parseLoadInput('', 'kg')).toEqual({ kind: 'empty' });
    expect(parseLoadInput('+10', 'kg')).toEqual({ kind: 'weight', kg: 10 });
    expect(parseLoadInput('200%', 'kg')).toBeNull();
    expect(parseLoadInput('x', 'kg')).toBeNull();
  });

  it('reads distance in km', () => {
    expect(parseDistanceInput('0.4')).toBe(400);
    expect(parseDistanceInput('5')).toBe(5000);
    expect(parseDistanceInput('0')).toBeNull();
  });

  it('reads RIR, RPE and tempo', () => {
    expect(parseRirInput('2')).toBe(2);
    expect(parseRirInput('')).toBeNull();
    expect(parseRirInput('7')).toBeUndefined();
    expect(parseRpeInput('8.5')).toBe(8.5);
    expect(parseRpeInput('8.3')).toBeUndefined();
    expect(parseRpeInput('4')).toBeUndefined();
    expect(parseTempoInput('3110')).toBe('3-1-1-0');
    expect(parseTempoInput('2-0-x-0')).toBe('2-0-X-0');
    expect(parseTempoInput('31')).toBeUndefined();
    expect(parseTempoInput('')).toBeNull();
  });

  it('formats cells', () => {
    expect(formatRepsTarget(set({ reps: 5 }))).toBe('5');
    expect(
      formatRepsTarget(set({ targetType: 'rep_range', reps: null, repsMin: 8, repsMax: 10 })),
    ).toBe('8–10');
    expect(formatLoad(set({ weightKg: 60 }), 'kg')).toBe('60');
    expect(formatLoad(set({ weightKg: 60 }), 'lb')).toBe('132.3');
    expect(formatLoad(set({ weightMode: 'percent_of_top_set', weightPercent: 85 }), 'kg')).toBe(
      '85%',
    );
    expect(formatLoad(set({ weightKg: null }), 'kg')).toBe('');
  });
});
