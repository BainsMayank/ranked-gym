import {
  bodyweightRate,
  goalProgress,
  movingAverage,
  projectedDate,
  rangeFor,
  validDate,
} from '../metrics';
import type { Goal } from '../schema';

const goal: Goal = {
  id: 'test',
  type: 'bodyweight',
  target: { title: 'Reach 70 kg', kg: 70 },
  start_value: 80,
  current_value: 75,
  target_value: 70,
  deadline: null,
  status: 'active',
  auto_post: false,
  achieved_at: null,
  created_at: '2026-10-01',
  observations: [],
};
test('loss and gain goals progress in the correct direction', () => {
  expect(goalProgress(goal)).toBe(0.5);
  expect(goalProgress({ ...goal, start_value: 60 })).toBe(1);
  expect(goalProgress({ ...goal, current_value: 85 })).toBe(0);
  expect(goalProgress({ ...goal, status: 'achieved' })).toBe(1);
});
test('date validation rejects overflow dates', () => {
  expect(validDate('2026-02-30')).toBe(false);
  expect(validDate('2024-02-29')).toBe(true);
  expect(validDate('2026-2-1')).toBe(false);
});
test('ranges cover calendar days rather than a rolling partial day', () => {
  const range = rangeFor(14, new Date(2026, 9, 9, 12));
  const start = new Date(range.start),
    end = new Date(range.end);
  expect(start.getDate()).toBe(26);
  expect(end.getDate()).toBe(10);
  expect(start.getHours()).toBe(0);
});
test('trend projects a rising or falling value, requires four observations and rejects flat trends', () => {
  const points = [0, 7, 14, 21].map((n, i) => ({
    at: new Date(Date.UTC(2026, 9, 1 + n)).toISOString(),
    value: 50 + i * 5,
  }));
  expect(projectedDate(points, 70)).toBe('2026-10-29');
  expect(projectedDate(points.slice(1), 70)).toBeNull();
  expect(
    projectedDate(
      points.map((p) => ({ ...p, value: 50 })),
      70,
    ),
  ).toBeNull();
  expect(projectedDate(points, 40)).toBeNull();
});
test('bodyweight warning threshold uses change relative to starting weight per week', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  expect(bodyweightRate(80, 72, '2026-10-08', now)).toBeGreaterThan(0.01);
  expect(bodyweightRate(80, 79.5, '2026-10-15', now)).toBeLessThan(0.01);
  expect(bodyweightRate(80, 72, '2026-09-30', now)).toBeNull();
});
test('moving average includes only the last seven days with observations', () => {
  const data = [
    { at: '2026-10-01T00:00:00Z', kg: 80 },
    { at: '2026-10-02T00:00:00Z', kg: 78 },
    { at: '2026-10-09T00:00:00Z', kg: 76 },
  ];
  expect(movingAverage(data).map((p) => p.y)).toEqual([80, 79, 76]);
});

test('multiple weigh-ins on one day use the latest observation for the daily average', () => {
  const data = [
    { at: '2026-10-01T00:00:00Z', kg: 80 },
    { at: '2026-10-01T01:00:00Z', kg: 82 },
    { at: '2026-10-02T01:00:00Z', kg: 78 },
  ];
  expect(movingAverage(data).map((p) => p.y)).toEqual([82, 80]);
});
