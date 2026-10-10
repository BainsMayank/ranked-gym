import { effortFactor, fatigueFromSets, halfLife, recoveryNow, type FatigueSet } from '../recovery';

const at = Date.parse('2026-10-01T00:00:00Z');
const set: FatigueSet = {
  at,
  rir: null,
  rpe: null,
  muscles: [{ muscle: 'biceps', role: 'primary', weight: 1 }],
};
const pct = (sets: FatigueSet[], hours = 0, speed: 'slower' | 'normal' | 'faster' = 'normal') =>
  recoveryNow(
    fatigueFromSets(sets, at + hours * 3600000, speed),
    at + hours * 3600000,
    at + hours * 3600000,
    speed,
  ).find((r) => r.muscle === 'biceps')!.percent;

test('default RIR 2, RPE conversion and actual RIR precedence', () => {
  expect(effortFactor(null, null)).toBe(1);
  expect(effortFactor(null, 10)).toBe(1.3);
  expect(effortFactor(2, 10)).toBe(1);
  expect(effortFactor(10, null)).toBe(0.5);
  expect(effortFactor(-10, null)).toBe(1.5);
});
test('five fresh primary sets are 50%, ten are 0%', () => {
  expect(pct(Array(5).fill(set))).toBe(50);
  expect(pct(Array(10).fill(set))).toBe(0);
});
test('fatigue halves exactly after one half-life', () => {
  expect(pct(Array(10).fill(set), 24)).toBeCloseTo(50);
  expect(pct(Array(10).fill(set), 48)).toBeCloseTo(75);
});
test('secondary weighting and stabilisers', () => {
  const secondary = {
    ...set,
    muscles: [{ muscle: 'biceps' as const, role: 'secondary', weight: 0.5 }],
  };
  expect(pct([secondary])).toBeCloseTo(95);
  expect(pct([{ ...secondary, muscles: [{ ...secondary.muscles[0]!, role: 'stabiliser' }] }])).toBe(
    100,
  );
});
test('repeated workouts add before the normalisation clamp', () => {
  expect(pct(Array(20).fill(set))).toBe(0);
  expect(pct(Array(20).fill(set), 24)).toBeCloseTo(0);
  expect(pct(Array(20).fill(set), 48)).toBeCloseTo(50);
});
test('larger lower-body muscles recover more slowly', () => {
  expect(halfLife('quads')).toBe(60);
  expect(halfLife('biceps')).toBe(24);
});
test('slower, normal and faster speed order', () => {
  const sets = Array(5).fill(set);
  expect(pct(sets, 24, 'slower')).toBeLessThan(pct(sets, 24));
  expect(pct(sets, 24)).toBeLessThan(pct(sets, 24, 'faster'));
});
test('future timestamps ignored and backward clocks cannot add fatigue', () => {
  expect(pct([{ ...set, at: at + 1 }])).toBe(100);
  const snapshot = fatigueFromSets([set], at, 'normal');
  expect(
    recoveryNow(snapshot, at, at - 1000, 'normal').find((r) => r.muscle === 'biceps')!.percent,
  ).toBe(90);
});
test('cached snapshot decay equals a full reference recompute hour by hour', () => {
  const sets = [set, { ...set, at: at - 86400000, rir: 0 }];
  const snap = fatigueFromSets(sets, at, 'normal');
  for (const hours of [1, 2, 12, 24, 72]) {
    const now = at + hours * 3600000;
    const cached = recoveryNow(snap, at, now, 'normal');
    const full = recoveryNow(fatigueFromSets(sets, now, 'normal'), now, now, 'normal');
    expect(cached).toEqual(
      full.map((r, i) => ({ ...r, percent: expect.closeTo(cached[i]!.percent, 10) })),
    );
  }
});
test('no logged load gives 100% with no last-trained timestamp', () => {
  expect(
    recoveryNow([], at, at, 'normal').every((r) => r.percent === 100 && r.lastTrained === null),
  ).toBe(true);
});
