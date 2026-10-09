import { exercise, set } from '../__fixtures__/routine';
import {
  DURATION_MODEL as M,
  estimateDurationMin,
  estimateDurationSec,
  secondsPerRep,
  workSeconds,
} from '../duration';

describe('duration estimation', () => {
  it('is zero for an empty routine', () => {
    expect(estimateDurationSec([])).toBe(0);
    expect(estimateDurationMin([])).toBe(0);
  });

  it('counts work, rest between sets (not after the last) and setup', () => {
    const e = exercise({ restSeconds: 90, sets: [set({ reps: 10 }), set({ reps: 10 })] });
    // 2 × 30 s work + one 90 s rest + 60 s setup.
    expect(estimateDurationSec([e])).toBe(30 + 90 + 30 + M.setupSec);
  });

  it('uses the midpoint of a rep range, the tempo and timed targets', () => {
    expect(workSeconds(set({ targetType: 'rep_range', reps: null, repsMin: 8, repsMax: 12 }))).toBe(
      30,
    );
    expect(secondsPerRep('3-1-1-0')).toBe(5);
    expect(secondsPerRep('2-0-X-0')).toBe(3);
    expect(workSeconds(set({ reps: 6, tempo: '3-1-1-0' }))).toBe(30);
    expect(workSeconds(set({ targetType: 'duration', reps: null, durationSec: 45 }))).toBe(45);
    expect(workSeconds(set({ targetType: 'distance', reps: null, distanceM: 1000 }))).toBe(360);
  });

  it('caps rest after warm-ups and gives drop sets a short gap', () => {
    const e = exercise({
      restSeconds: 180,
      sets: [
        set({ setType: 'warmup', reps: 5 }),
        set({ reps: 5 }),
        set({ setType: 'drop', reps: 5 }),
      ],
    });
    // 15 + 60 (capped warm-up rest) + 15 + 10 (drop gap) + 15 + setup.
    expect(estimateDurationSec([e])).toBe(15 + 60 + 15 + M.dropRestSec + 15 + M.setupSec);
  });

  it('runs supersets in rounds with a move between members and the round rest after', () => {
    const a = exercise({
      supersetGroup: 1,
      restSeconds: 0,
      restAfterSupersetSeconds: 90,
      sets: [set({ reps: 10 }), set({ reps: 10 })],
    });
    const b = exercise({
      supersetGroup: 1,
      restSeconds: 0,
      restAfterSupersetSeconds: 90,
      sets: [set({ reps: 10 }), set({ reps: 10 })],
    });
    // Round: a (30) + move 15, b (30) + round rest 90; twice; no rest after the last set.
    const expected = (30 + 15 + 30 + 90) * 2 - 90 + 2 * M.setupSec;
    expect(estimateDurationSec([a, b])).toBe(expected);
  });

  it('handles members with different set counts', () => {
    const a = exercise({ supersetGroup: 1, restSeconds: 0, restAfterSupersetSeconds: 60 });
    const b = exercise({
      supersetGroup: 1,
      restSeconds: 0,
      restAfterSupersetSeconds: 60,
      sets: [set()],
    });
    // Round 1: a, b; rounds 2–3: a only.
    const expected = 30 + 15 + 30 + 60 + (30 + 60) + 30 + 2 * M.setupSec;
    expect(estimateDurationSec([a, b])).toBe(expected);
  });

  it('rounds to the nearest 5 minutes, at least 5', () => {
    expect(estimateDurationMin([exercise({ sets: [set({ reps: 1 })] })])).toBe(5);
    const big = Array.from({ length: 6 }, () =>
      exercise({ restSeconds: 120, sets: [set(), set(), set(), set()] }),
    );
    // Each: 4 × 30 + 3 × 120 + 60 = 540 s, plus 120 s between exercises: 5 × 120 + 6 × 540.
    expect(estimateDurationSec(big)).toBe(6 * 540 + 5 * 120);
    expect(estimateDurationMin(big)).toBe(65);
  });
});
