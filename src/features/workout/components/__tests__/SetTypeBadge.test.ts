import { workingNumbers } from '../SetTypeBadge';

describe('workingNumbers', () => {
  it('numbers only working sets, skipping warm-up, top, drop and failure sets', () => {
    const sets = [
      { type: 'warmup', kg: '60', reps: '10', effort: '–' },
      { type: 'top', kg: '140', reps: '5', effort: '1' },
      { type: 'working', kg: '120', reps: '6', effort: '2' },
      { type: 'working', kg: '120', reps: '6', effort: '2' },
      { type: 'drop', kg: '90', reps: '10', effort: '0' },
    ] as const;
    expect(workingNumbers(sets)).toEqual([undefined, undefined, 1, 2, undefined]);
  });
});
