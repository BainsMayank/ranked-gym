import { analyticsSchema } from '../schema';

const base = {
  asOf: '2026-10-10T09:42:49+00:00',
  start: '2026-10-03T00:00:00+00:00',
  end: '2026-10-10T09:42:49+00:00',
  zone: 'Asia/Kolkata',
  speed: 'normal',
  streak: 0,
  periods: [
    { period: 0, sessions: 1, volume: 100, duration: 30, calories: null, missing_calories: 1 },
    { period: 1, sessions: 0, volume: 0, duration: 0, calories: null, missing_calories: 0 },
  ],
  daily: [],
  muscles: [],
  fatigue: [],
  bodyweight: [],
  records: [],
  previous_records: 0,
  rankups: [],
};

describe('analyticsSchema', () => {
  // Postgres returns personal_records.id and rank_events.id as bigint, which arrive as numbers.
  it('accepts numeric record and rank-up ids from the server', () => {
    const parsed = analyticsSchema.parse({
      ...base,
      records: [
        {
          id: 3091517,
          at: '2026-10-06T12:58:00+00:00',
          name: 'Barbell overhead press',
          kind: 'e1rm',
          value: 53.97,
          previous_value: 53.3,
          weight_kg: null,
          workout_id: 'ef1e1cf4-40de-4d5d-82bf-4f2e22ea282f',
        },
      ],
      rankups: [
        {
          id: 12,
          at: '2026-10-06T12:58:00+00:00',
          name: 'Bench press',
          tier: 'gold',
          division: 2,
          workout_id: null,
        },
      ],
    });
    expect(parsed.records[0]?.id).toBe('3091517');
    expect(parsed.rankups[0]?.id).toBe('12');
  });
});
