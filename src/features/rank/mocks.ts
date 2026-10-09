import type { Rank } from '@/lib/game';
import type { RankTier } from '@/theme';

/**
 * Layout data until the rank engine (Phase 6) and Rank tab (Phase 7) land. Every rank, score and
 * prediction here will come from the server; the client only displays them.
 *
 * Numbers follow docs/RANK_SYSTEM.md for a 72 kg man (men's standards): each rank and Strength Score
 * (SS) below is what src/lib/game/strength.ts gives for the logged sets.
 */

export const season = { label: 'Season 4 · 23 days left' };

export const overall = {
  rank: { tier: 'platinum', division: 3 } as Rank,
  strengthScore: 319,
  standing: 'top 18% in Delhi',
  progress: 0.91,
  pointsToNext: 1.3,
  nextLabel: 'Platinum II',
};

export const disciplines = [
  {
    name: 'Weightlifting',
    rank: { tier: 'platinum', division: 3 } as Rank,
    meta: '10 lifts ranked',
    score: 'SS 319 · +9 this month',
    progress: 0.91,
  },
  {
    name: 'Calisthenics',
    rank: { tier: 'silver', division: 1 } as Rank,
    meta: '3 skills ranked',
    score: 'SS 236 · +6 this month',
    progress: 0.8,
  },
];

/** Rank ordinal per week for the last 12 weeks (see rankOrdinal in lib/game). */
export const progression = {
  weeks: [14.2, 14.5, 14.8, 15.3, 16.1, 16.3, 16.6, 16.8, 17.1, 17.4, 17.7, 17.9],
  note: 'Promoted to Platinum IV in week 5 and Platinum III in week 9',
};

export const lifts: { name: string; rank: Rank; progress: number; meta: string }[] = [
  {
    name: 'Squat',
    rank: { tier: 'platinum', division: 1 },
    progress: 0.59,
    meta: 'e1RM 163 kg · 2.27× bodyweight',
  },
  {
    name: 'Bench press',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.46,
    meta: 'e1RM 108 kg · 1.50× bodyweight',
  },
  {
    name: 'Deadlift',
    rank: { tier: 'platinum', division: 2 },
    progress: 0.43,
    meta: 'e1RM 175 kg · 2.43× bodyweight',
  },
  {
    name: 'Pull-up',
    rank: { tier: 'gold', division: 3 },
    progress: 0.19,
    meta: '+15 kg × 5 · 1.41× bodyweight',
  },
  {
    name: 'Overhead press',
    rank: { tier: 'gold', division: 1 },
    progress: 0.72,
    meta: 'e1RM 64 kg · 0.89× bodyweight',
  },
];

export const muscleIds = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'traps',
  'lats',
  'lowerBack',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
] as const;
export type MuscleId = (typeof muscleIds)[number];

export const muscles: Record<
  MuscleId,
  { name: string; rank: Rank; progress: number; detail: string }
> = {
  chest: {
    name: 'Chest',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.46,
    detail: 'Bench 92.5 kg × 5 · 14 sets this week',
  },
  shoulders: {
    name: 'Shoulders',
    rank: { tier: 'gold', division: 1 },
    progress: 0.72,
    detail: 'OHP 55 kg × 5 · 12 sets this week',
  },
  biceps: {
    name: 'Biceps',
    rank: { tier: 'gold', division: 2 },
    progress: 0.88,
    detail: 'Row 80 kg × 8 · 8 sets this week',
  },
  triceps: {
    name: 'Triceps',
    rank: { tier: 'gold', division: 2 },
    progress: 0.05,
    detail: 'Bench 92.5 kg × 5 · 9 sets this week',
  },
  forearms: {
    name: 'Forearms',
    rank: { tier: 'gold', division: 2 },
    progress: 0.95,
    detail: 'Deadlift 150 kg × 5 · 4 sets this week',
  },
  core: {
    name: 'Core',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.15,
    detail: 'Squat 140 kg × 5 · 6 sets this week',
  },
  traps: {
    name: 'Traps',
    rank: { tier: 'platinum', division: 2 },
    progress: 0.31,
    detail: 'Row 80 kg × 8 · 6 sets this week',
  },
  lats: {
    name: 'Lats',
    rank: { tier: 'platinum', division: 2 },
    progress: 0.31,
    detail: 'Row 80 kg × 8 · 12 sets this week',
  },
  lowerBack: {
    name: 'Lower back',
    rank: { tier: 'platinum', division: 2 },
    progress: 0.43,
    detail: 'Deadlift 150 kg × 5 · 6 sets this week',
  },
  glutes: {
    name: 'Glutes',
    rank: { tier: 'platinum', division: 1 },
    progress: 0.59,
    detail: 'Squat 140 kg × 5 · 10 sets this week',
  },
  quads: {
    name: 'Quads',
    rank: { tier: 'platinum', division: 1 },
    progress: 0.59,
    detail: 'Squat 140 kg × 5 · 15 sets this week',
  },
  hamstrings: {
    name: 'Hamstrings',
    rank: { tier: 'platinum', division: 2 },
    progress: 0.43,
    detail: 'Deadlift 150 kg × 5 · 6 sets this week',
  },
  calves: {
    name: 'Calves',
    rank: { tier: 'bronze', division: 2 },
    progress: 0.3,
    detail: 'Calf raise 60 kg × 12 · 4 sets this week',
  },
};

export const league = {
  tier: 'gold' as RankTier,
  name: 'Gold league',
  meta: 'Week 14 · ends in 3d 06h · 30 lifters',
  position: 4,
  xp: '1,820',
  promoteTop: 7,
  standings: [
    { position: 1, name: 'Dev P.', xp: '2,640' },
    { position: 2, name: 'Neha K.', xp: '2,310' },
    { position: 3, name: 'Aarav Rana', xp: '1,990' },
    { position: 4, name: 'Mayank Bains', xp: '1,820', isYou: true },
    { position: 5, name: 'Kabir Mehta', xp: '1,760' },
    { position: 6, name: 'Ishita Sharma', xp: '1,525' },
    { position: 7, name: 'Tanya S.', xp: '1,410' },
    { position: 8, name: 'Yash G.', xp: '1,380' },
  ],
  demotion: [{ position: 26, name: 'Rohan V.', xp: '420' }],
};

export const clash = {
  home: { name: 'DTU', points: 48210 },
  away: { name: 'NSUT', points: 41870 },
  note: 'Points from members’ workouts and rank-ups · you contributed 1,820',
};

export const events = [
  {
    title: 'Hostel Cup · DTU',
    meta: 'BH-4 leads · your hostel is 2nd of 9',
    action: 'Standings',
    game: false,
  },
  {
    title: 'Bench Press Open · October',
    meta: 'Video-verified · weight classes · 612 entered',
    action: 'Enter',
    game: true,
  },
];

export const predictions: { lift: string; target: Rank; need: string; weeks: number }[] = [
  {
    lift: 'Bench',
    target: { tier: 'platinum', division: 2 },
    need: 'Need 95 kg × 5 (e1RM 111) · you’re at 108',
    weeks: 3,
  },
  {
    lift: 'Deadlift',
    target: { tier: 'platinum', division: 1 },
    need: 'Need 155 kg × 5 · you’re at 150 × 5',
    weeks: 4,
  },
  {
    lift: 'Pull-up',
    target: { tier: 'gold', division: 2 },
    need: 'Need +17.5 kg × 5 · you’re at +15 kg',
    weeks: 3,
  },
];

export const rankUpsByDay = [
  { label: 'Mon', value: 7 },
  { label: 'Tue', value: 3 },
  { label: 'Wed', value: 4 },
  { label: 'Thu', value: 2 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 2 },
  { label: 'Sun', value: 0 },
];

export const regions: { name: string; share: number; tier: RankTier }[] = [
  { name: 'Upper push', share: 0.32, tier: 'gold' },
  { name: 'Legs', share: 0.28, tier: 'platinum' },
  { name: 'Upper pull', share: 0.26, tier: 'platinum' },
  { name: 'Core', share: 0.14, tier: 'platinum' },
];

export const tierCounts: { tier: RankTier; count: number }[] = [
  { tier: 'bronze', count: 1 },
  { tier: 'gold', count: 4 },
  { tier: 'platinum', count: 8 },
];

export const balance = [
  {
    name: 'Push : Pull',
    range: 'Healthy range 0.9 – 1.1',
    value: '1.18',
    status: 'Push-heavy',
    ok: false,
  },
  {
    name: 'Quad : Hamstring',
    range: 'Healthy range 1.2 – 1.5',
    value: '1.36',
    status: 'Balanced',
    ok: true,
  },
  { name: 'Left : Right (DB)', range: 'Within 5%', value: '3%', status: 'Balanced', ok: true },
];

export const records = [
  { lift: 'Back squat', best: '140 kg × 5', e1rm: '163 kg', date: '3 days ago', isNew: true },
  {
    lift: 'Romanian deadlift',
    best: '110 kg × 8',
    e1rm: '139 kg',
    date: '3 days ago',
    isNew: true,
  },
  { lift: 'Bench press', best: '92.5 kg × 5', e1rm: '108 kg', date: '1 week ago', isNew: false },
  { lift: 'Deadlift', best: '150 kg × 5', e1rm: '175 kg', date: '2 weeks ago', isNew: false },
  { lift: 'Pull-up', best: '+15 kg × 5', e1rm: '—', date: '3 weeks ago', isNew: false },
  { lift: 'Overhead press', best: '55 kg × 5', e1rm: '64 kg', date: '1 month ago', isNew: false },
];
