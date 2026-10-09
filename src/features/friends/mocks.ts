import type { Rank } from '@/lib/game';

/** Layout data until friends, invites and leaderboards land (Phase 10). */

export const summary = { friends: 38, activeNow: 6 };

export const invite = {
  code: 'MAYANK-7Q2',
  reward:
    '+300 XP for every friend who logs their first workout. 5 invites unlock the Founder badge.',
  joined: 2,
  goal: 5,
};

export const standings = [
  { label: 'Among friends', value: '#3' },
  { label: 'Delhi', value: '#1,204' },
  { label: 'Global', value: 'Top 21%' },
];

export const requests: { name: string; meta: string; rank: Rank }[] = [
  { name: 'Pranav K.', meta: 'DTU · 4 mutual friends', rank: { tier: 'gold', division: 3 } },
  { name: 'Ananya J.', meta: 'Found you via Discover', rank: { tier: 'silver', division: 2 } },
];

export const friends: {
  name: string;
  rank: Rank;
  status: string;
  training: boolean;
  action: 'Cheer' | 'View' | 'Nudge';
}[] = [
  {
    name: 'Aarav Rana',
    rank: { tier: 'gold', division: 2 },
    status: 'Training now · Leg day · 18-day streak',
    training: true,
    action: 'Cheer',
  },
  {
    name: 'Dev P.',
    rank: { tier: 'platinum', division: 2 },
    status: 'Worked out 3h ago · 41-day streak',
    training: false,
    action: 'View',
  },
  {
    name: 'Ishita Sharma',
    rank: { tier: 'silver', division: 1 },
    status: 'Worked out yesterday · 9-day streak',
    training: false,
    action: 'View',
  },
  {
    name: 'Riya S.',
    rank: { tier: 'bronze', division: 3 },
    status: 'Inactive for 6 days · streak lost',
    training: false,
    action: 'Nudge',
  },
];

export const scopes = [
  { value: 'friends', label: 'Friends' },
  { value: 'regional', label: 'Regional' },
  { value: 'global', label: 'Global' },
] as const;

export const metrics = [
  'Strength score',
  'Bench',
  'Squat',
  'Deadlift',
  'Volume',
  'Streak',
] as const;

export const board: {
  position: number;
  name: string;
  rank: Rank;
  score: string;
  movement: number;
}[] = [
  { position: 1, name: 'Harsh V.', rank: { tier: 'champion' }, score: '541', movement: 0 },
  {
    position: 2,
    name: 'Simran B.',
    rank: { tier: 'master', division: 2 },
    score: '478',
    movement: 1,
  },
  {
    position: 3,
    name: 'Arjun T.',
    rank: { tier: 'master', division: 3 },
    score: '446',
    movement: -1,
  },
  {
    position: 4,
    name: 'Kunal N.',
    rank: { tier: 'diamond', division: 1 },
    score: '421',
    movement: 2,
  },
  {
    position: 5,
    name: 'Meera R.',
    rank: { tier: 'diamond', division: 1 },
    score: '414',
    movement: 0,
  },
  {
    position: 6,
    name: 'Vikram S.',
    rank: { tier: 'diamond', division: 2 },
    score: '402',
    movement: 4,
  },
  {
    position: 7,
    name: 'Nikhil A.',
    rank: { tier: 'diamond', division: 2 },
    score: '397',
    movement: -2,
  },
  {
    position: 8,
    name: 'Pooja S.',
    rank: { tier: 'diamond', division: 3 },
    score: '381',
    movement: 1,
  },
];

export const you = {
  position: '#1,204',
  name: 'Mayank Bains',
  rank: { tier: 'platinum', division: 3 } as Rank,
  standing: 'top 18%',
  score: '319',
};
