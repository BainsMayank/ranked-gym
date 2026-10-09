import type { PlanInput } from '../types';
import { idOf, input } from './library';

/** The 10 reference profiles (docs/PLAN_ENGINE.md). */
export const PROFILES: [string, PlanInput][] = [
  [
    '1. Beginner, build muscle, Mon/Wed/Fri, 60 min, full gym, 8 weeks',
    input({
      goal: 'muscle',
      level: 'beginner',
      schedule: { kind: 'weekdays', weekdays: [0, 2, 4] },
      minutes: 60,
      weeks: 8,
    }),
  ],
  [
    '2. Intermediate, get stronger, 4 days, 75 min, full gym, 6 weeks',
    input({
      goal: 'stronger',
      level: 'intermediate',
      schedule: { kind: 'count', days: 4 },
      minutes: 75,
      weeks: 6,
    }),
  ],
  [
    '3. Advanced, build muscle, 6 days, 90 min, chest and shoulders priority, 8 weeks',
    input({
      goal: 'muscle',
      level: 'advanced',
      schedule: { kind: 'count', days: 6 },
      minutes: 90,
      priorities: ['chest', 'shoulders'],
      weeks: 8,
    }),
  ],
  [
    '4. Beginner, lose fat, Mon/Tue/Wed, 45 min, home dumbbells, cardio, 4 weeks',
    input({
      goal: 'fat',
      level: 'beginner',
      schedule: { kind: 'weekdays', weekdays: [0, 1, 2] },
      minutes: 45,
      equipment: { preset: 'dumbbells', custom: [], bars: false },
      cardio: true,
      weeks: 4,
    }),
  ],
  [
    '5. Intermediate, curvier, Mon/Tue/Thu/Fri, 60 min, glutes and hamstrings priority, 8 weeks',
    input({
      goal: 'curvier',
      level: 'intermediate',
      schedule: { kind: 'weekdays', weekdays: [0, 1, 3, 4] },
      minutes: 60,
      priorities: ['glutes', 'hamstrings'],
      weeks: 8,
    }),
  ],
  [
    '6. Beginner, calisthenics, 3 days, 45 min, bodyweight with bars, 6 weeks',
    input({
      goal: 'calisthenics',
      level: 'beginner',
      schedule: { kind: 'count', days: 3 },
      minutes: 45,
      equipment: { preset: 'bodyweight', custom: [], bars: true },
      weeks: 6,
    }),
  ],
  [
    '7. Intermediate, gain weight, Mon–Fri, 60 min, full gym, 8 weeks',
    input({
      goal: 'gain',
      level: 'intermediate',
      schedule: { kind: 'weekdays', weekdays: [0, 1, 2, 3, 4] },
      minutes: 60,
      weeks: 8,
    }),
  ],
  [
    '8. Advanced, get stronger, Sat/Sun, 90 min, avoids back squat and deadlift, 6 weeks',
    input({
      goal: 'stronger',
      level: 'advanced',
      schedule: { kind: 'weekdays', weekdays: [5, 6] },
      minutes: 90,
      avoid: [idOf('barbell-back-squat'), idOf('barbell-deadlift')],
      weeks: 6,
    }),
  ],
  [
    '9. Beginner, get toned, 2 days, 30 min, bodyweight without bars, 4 weeks',
    input({
      goal: 'toned',
      level: 'beginner',
      schedule: { kind: 'count', days: 2 },
      minutes: 30,
      equipment: { preset: 'bodyweight', custom: [], bars: false },
      cardio: true,
      weeks: 4,
    }),
  ],
  [
    '10. Intermediate, general fitness, Thu–Mon (incl. Sun and Mon), 45 min, dumbbells + cables + machines, 6 weeks',
    input({
      goal: 'general',
      level: 'intermediate',
      schedule: { kind: 'weekdays', weekdays: [0, 3, 4, 5, 6] },
      minutes: 45,
      equipment: { preset: 'custom', custom: ['dumbbell', 'cable', 'machine'], bars: false },
      weeks: 6,
    }),
  ],
];
