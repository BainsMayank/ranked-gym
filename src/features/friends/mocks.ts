import type { Rank } from '@/lib/game';

/** Layout data until invites and leaderboards land (Phase 10). Friends and requests are real. */

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
