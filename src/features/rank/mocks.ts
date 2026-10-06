import type { Rank } from '@/lib/game';
import type { RankTier } from '@/theme';

/**
 * Layout data until the rank engine (Phase 6) and Rank tab (Phase 7) land. Every rank, score and
 * prediction here will come from the server; the client only displays them.
 */

export const season = { label: 'Season 4 · 23 days left' };

export const overall = {
  rank: { tier: 'gold', division: 2 } as Rank,
  powerScore: 2184,
  standing: 'top 18% in Delhi',
  progress: 0.62,
  pointsToNext: 116,
  nextLabel: 'Gold I',
};

export const disciplines = [
  {
    name: 'Weightlifting',
    rank: { tier: 'platinum', division: 3 } as Rank,
    meta: '5 lifts ranked',
    score: 'Score 2,410 · +140 this month',
    progress: 0.2,
  },
  {
    name: 'Calisthenics',
    rank: { tier: 'silver', division: 1 } as Rank,
    meta: '3 skills ranked',
    score: 'Score 1,560 · +60 this month',
    progress: 0.8,
  },
];

/** Rank ordinal per week for the last 12 weeks (see rankOrdinal in lib/game). */
export const progression = {
  weeks: [9, 9.4, 10, 10.2, 12, 12.4, 13, 13.5, 14, 14.4, 14.8, 14.9],
  note: 'Promoted to Gold III in week 5 and Gold II in week 9',
};

export const lifts: { name: string; rank: Rank; progress: number; meta: string }[] = [
  {
    name: 'Squat',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.22,
    meta: 'e1RM 151 kg · 2.11× bodyweight',
  },
  {
    name: 'Bench press',
    rank: { tier: 'gold', division: 1 },
    progress: 0.8,
    meta: 'e1RM 101 kg · 1.41× bodyweight',
  },
  {
    name: 'Deadlift',
    rank: { tier: 'gold', division: 2 },
    progress: 0.54,
    meta: 'e1RM 168 kg · 2.35× bodyweight',
  },
  {
    name: 'Pull-up',
    rank: { tier: 'gold', division: 3 },
    progress: 0.3,
    meta: '+15 kg × 5 · 12 bodyweight reps',
  },
  {
    name: 'Overhead press',
    rank: { tier: 'silver', division: 1 },
    progress: 0.88,
    meta: 'e1RM 58 kg · 0.81× bodyweight',
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
    rank: { tier: 'gold', division: 1 },
    progress: 0.7,
    detail: 'Bench 100 kg × 3 · 14 sets this week',
  },
  shoulders: {
    name: 'Shoulders',
    rank: { tier: 'gold', division: 3 },
    progress: 0.35,
    detail: 'OHP 55 kg × 5 · 12 sets this week',
  },
  biceps: {
    name: 'Biceps',
    rank: { tier: 'silver', division: 1 },
    progress: 0.6,
    detail: 'Curl 20 kg × 10 · 8 sets this week',
  },
  triceps: {
    name: 'Triceps',
    rank: { tier: 'silver', division: 1 },
    progress: 0.5,
    detail: 'Dips +10 kg × 8 · 9 sets this week',
  },
  forearms: {
    name: 'Forearms',
    rank: { tier: 'bronze', division: 1 },
    progress: 0.4,
    detail: 'Dead hang 0:45 · 4 sets this week',
  },
  core: {
    name: 'Core',
    rank: { tier: 'silver', division: 2 },
    progress: 0.45,
    detail: 'Plank 0:45 +10 kg · 6 sets this week',
  },
  traps: {
    name: 'Traps',
    rank: { tier: 'gold', division: 2 },
    progress: 0.5,
    detail: 'Shrug 80 kg × 10 · 6 sets this week',
  },
  lats: {
    name: 'Lats',
    rank: { tier: 'gold', division: 2 },
    progress: 0.55,
    detail: 'Pull-up +15 kg × 5 · 12 sets this week',
  },
  lowerBack: {
    name: 'Lower back',
    rank: { tier: 'gold', division: 3 },
    progress: 0.3,
    detail: 'Deadlift 150 kg × 5 · 6 sets this week',
  },
  glutes: {
    name: 'Glutes',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.25,
    detail: 'Hip thrust 140 kg × 8 · 10 sets this week',
  },
  quads: {
    name: 'Quads',
    rank: { tier: 'platinum', division: 3 },
    progress: 0.22,
    detail: 'Squat 140 kg × 5 · 15 sets this week',
  },
  hamstrings: {
    name: 'Hamstrings',
    rank: { tier: 'silver', division: 1 },
    progress: 0.65,
    detail: 'RDL 110 kg × 8 · 6 sets this week',
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
    target: { tier: 'platinum', division: 3 },
    need: 'Need 95 kg × 5 (e1RM 107) · you’re at 101',
    weeks: 3,
  },
  {
    lift: 'Deadlift',
    target: { tier: 'gold', division: 1 },
    need: 'Need 160 kg × 5 · you’re at 150 × 5',
    weeks: 5,
  },
  {
    lift: 'Pull-up',
    target: { tier: 'gold', division: 2 },
    need: 'Need +20 kg × 5 · you’re at +15 kg',
    weeks: 4,
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
  { name: 'Upper pull', share: 0.26, tier: 'diamond' },
  { name: 'Core', share: 0.14, tier: 'master' },
];

export const tierCounts: { tier: RankTier; count: number }[] = [
  { tier: 'bronze', count: 2 },
  { tier: 'silver', count: 4 },
  { tier: 'gold', count: 5 },
  { tier: 'platinum', count: 2 },
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
  { lift: 'Back squat', best: '140 kg × 5', e1rm: '157 kg', date: '3 days ago', isNew: true },
  {
    lift: 'Romanian deadlift',
    best: '110 kg × 8',
    e1rm: '139 kg',
    date: '3 days ago',
    isNew: true,
  },
  { lift: 'Bench press', best: '92.5 kg × 5', e1rm: '104 kg', date: '1 week ago', isNew: false },
  { lift: 'Deadlift', best: '150 kg × 5', e1rm: '168 kg', date: '2 weeks ago', isNew: false },
  { lift: 'Pull-up', best: '+15 kg × 5', e1rm: '—', date: '3 weeks ago', isNew: false },
  { lift: 'Overhead press', best: '55 kg × 5', e1rm: '62 kg', date: '1 month ago', isNew: false },
];
