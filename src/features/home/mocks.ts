import type { Rank } from '@/lib/game';
import type { RankTier } from '@/theme';

/**
 * Layout data until the real sources land: For You (Phase 8), Feed and Discover (Phase 9).
 * Shapes are close to what the API will return, so screens shouldn't need restructuring.
 */

export const today = {
  planLabel: 'Today · Week 3 of strength plan',
  title: 'Push day A',
  exercises: ['Bench', 'Incline DB', 'OHP', 'Lateral raise', 'Dips', 'Pushdown'],
  durationMin: 55,
};

export const muscleVolume = {
  targetMin: 10,
  targetMax: 20,
  rows: [
    { muscle: 'Chest', sets: 14 },
    { muscle: 'Back', sets: 16 },
    { muscle: 'Shoulders', sets: 12 },
    { muscle: 'Quads', sets: 11 },
    { muscle: 'Hamstrings', sets: 6 },
    { muscle: 'Arms', sets: 10 },
  ],
};

export const recovery = [
  { muscle: 'Chest', percent: 62 },
  { muscle: 'Shoulders', percent: 74 },
  { muscle: 'Triceps', percent: 68 },
  { muscle: 'Back', percent: 100 },
  { muscle: 'Quads', percent: 94 },
  { muscle: 'Core', percent: 88 },
];

export const goals = [
  { title: 'Bench press 100 kg', progress: 0.925, value: '92.5 / 100 kg' },
  { title: 'Train 4× per week', progress: 0.75, value: '3 / 4 this week' },
  { title: 'Body weight 70 kg', progress: 0.55, value: '71.4 kg now' },
];

export const overview = {
  dailyVolume: [6, 0, 8, 9, 0, 10, 4, 0, 8, 9, 0, 11, 0, 10],
  stats: [
    { label: 'Volume', value: '48.3 t', delta: '+12%' },
    { label: 'Duration', value: '9h 40m', delta: '+1h 05m' },
    { label: 'Workouts', value: '9', delta: '+2' },
    { label: 'Records', value: '6 PRs', delta: '+3' },
    { label: 'Calories', value: '4,870', delta: '+8%' },
    { label: 'Body weight', value: '71.4', delta: '−0.6 kg' },
  ],
};

export const stories = [
  { name: 'Aarav Rana', active: true },
  { name: 'Ishita Sharma', active: true },
  { name: 'Kabir Mehta', active: false },
  { name: 'Riya Singh', active: false },
  { name: 'Dev Patel', active: false },
];

export type FeedItem =
  | {
      kind: 'workout';
      id: string;
      author: string;
      meta: string;
      title: string;
      caption: string;
      stats: { duration: string; volume: string; records: string };
      exercises: { name: string; detail: string; pr?: boolean }[];
      rankUp?: { text: string; tier: RankTier };
      likes: number;
      comments: number;
    }
  | {
      kind: 'media';
      id: string;
      author: string;
      meta: string;
      caption: string;
      likes: number;
      comments: number;
    }
  | { kind: 'streak'; id: string; author: string; days: number };

export const feed: FeedItem[] = [
  {
    kind: 'workout',
    id: 'p1',
    author: 'Aarav Rana',
    meta: '2h ago · Gold II · DTU',
    title: 'Heavy leg day',
    caption: 'Squats felt fast today. Finally broke 140.',
    stats: { duration: '1h 12m', volume: '12,450 kg', records: '2 PRs' },
    exercises: [
      { name: 'Back squat', detail: '4 × 5 · 140 kg', pr: true },
      { name: 'Romanian deadlift', detail: '3 × 8 · 110 kg' },
      { name: 'Leg press', detail: '3 × 12 · 220 kg' },
    ],
    rankUp: { text: 'Quads reached Platinum I', tier: 'platinum' },
    likes: 24,
    comments: 6,
  },
  {
    kind: 'media',
    id: 'p2',
    author: 'Ishita Sharma',
    meta: '5h ago · Calisthenics · Silver I',
    caption: 'First strict muscle-up after 4 months of work.',
    likes: 58,
    comments: 14,
  },
  { kind: 'streak', id: 'p3', author: 'Kabir Mehta', days: 30 },
];

export const discoverFilters = ['Same college', 'Near you', 'Similar rank', 'Same goal'] as const;

export const partners: { name: string; meta: string; rank: Rank }[] = [
  { name: 'Neha K.', meta: 'DTU · Hypertrophy · 4×/wk', rank: { tier: 'gold', division: 3 } },
  { name: 'Dev P.', meta: 'DTU · Strength · 5×/wk', rank: { tier: 'platinum', division: 2 } },
  { name: 'Aditi R.', meta: 'NSUT · Powerlifting · 4×/wk', rank: { tier: 'gold', division: 1 } },
];

export const communities = [
  { name: 'DTU Lifters', meta: '1,240 members · #3 in Delhi' },
  { name: 'Hostel BH-4 Gym Rats', meta: '86 members · Hostel Cup leader' },
  { name: 'Calisthenics Delhi', meta: '3,410 members · weekly meetups' },
];

export const openChallenge = {
  title: '30-day push-up ladder',
  startsIn: 'Starts in 2 days',
  meta: '2,184 joined · +500 XP and a profile badge on finish',
};
