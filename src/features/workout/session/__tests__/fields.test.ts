import { wset } from '@/lib/workouts/__fixtures__/workout';

import { draftFor, formatField, logFieldsFor, parseDraft, stepDraft, typeKey } from '../fields';

describe('keypad fields', () => {
  it('shows load, reps and one effort column for weighted work', () => {
    expect(logFieldsFor('weight_reps', 'rir')).toEqual(['weight', 'reps', 'rir']);
    expect(logFieldsFor('bodyweight_reps', 'both')).toEqual(['reps', 'rpe']);
    expect(logFieldsFor('distance_duration', 'rir')).toEqual(['distance', 'time']);
  });

  it('parses weight in the user unit and stores kg', () => {
    expect(parseDraft('weight', '102.5', 'kg')).toBe(102.5);
    expect(parseDraft('weight', '225', 'lb')).toBeCloseTo(102.06, 2);
    expect(parseDraft('weight', '', 'kg')).toBeNull();
    expect(parseDraft('weight', '2000', 'kg')).toBeUndefined();
  });

  it('reads time digits as m:ss, like a microwave', () => {
    expect(parseDraft('time', '130', 'kg')).toBe(90);
    expect(parseDraft('time', '45', 'kg')).toBe(45);
    expect(parseDraft('time', '175', 'kg')).toBeUndefined();
    expect(draftFor('time', 90, 'kg')).toBe('130');
  });

  it('keeps reps, RIR and RPE sensible', () => {
    expect(parseDraft('reps', '8.5', 'kg')).toBeUndefined();
    expect(parseDraft('rpe', '8.5', 'kg')).toBe(8.5);
    expect(parseDraft('rpe', '8.3', 'kg')).toBeUndefined();
    expect(parseDraft('rir', '11', 'kg')).toBeUndefined();
  });

  it('steps 2.5 kg or 5 lb, starting from the suggestion when empty', () => {
    expect(stepDraft('weight', '', 100, 1, 'kg')).toBe('102.5');
    expect(stepDraft('weight', '100', null, -1, 'kg')).toBe('97.5');
    expect(stepDraft('weight', '', null, -1, 'kg')).toBe('0');
    expect(stepDraft('weight', '225', null, 1, 'lb')).toBe('230');
    expect(stepDraft('reps', '', 8, 1, 'kg')).toBe('9');
    expect(stepDraft('time', '100', null, 1, 'kg')).toBe('115');
  });

  it('types sensibly', () => {
    expect(typeKey('weight', '', '.')).toBe('0.');
    expect(typeKey('weight', '2.5', '.')).toBe('2.5');
    expect(typeKey('reps', '8', '.')).toBe('8');
    expect(typeKey('weight', '1.25', '5')).toBe('1.25');
    expect(typeKey('reps', '0', '8')).toBe('8');
    expect(typeKey('weight', '10', 'back')).toBe('1');
  });

  it('formats stored values for the cell', () => {
    expect(formatField('weight', 102.06, 'lb')).toBe('225');
    expect(formatField('time', 90, 'kg')).toBe('1:30');
    expect(formatField('reps', wset({ reps: 8 }).reps, 'kg')).toBe('8');
    expect(formatField('reps', null, 'kg')).toBe('');
  });
});
