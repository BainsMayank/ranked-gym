import type { Rank } from '@/lib/game';
import type { Rarity, RankTier } from '@/theme';

/** Layout data until profiles, XP and customisation land (Phase 11). XP is granted server-side. */

export const me = {
  name: 'Mayank Bains',
  handle: '@mayank.lifts',
  college: 'Delhi Technological University',
  title: 'The Grinder',
  bio: 'Chasing a 2× bodyweight squat. Building this app with my friends.',
  rank: { tier: 'gold', division: 2 } as Rank,
  level: 23,
  xp: 4320,
  xpNext: 5000,
};

export const xpSources = [
  'Workout +100',
  'PR +50',
  'Rank up +250',
  'Streak day +20',
  'Invite +300',
];

export const profileStats = [
  { label: 'Workouts', value: '142' },
  { label: 'Day streak', value: '12', streak: true },
  { label: 'Followers', value: '86' },
  { label: 'Following', value: '91' },
];

export const badges: { mark: string; label: string; rarity: Rarity; locked?: boolean }[] = [
  { mark: '100', label: '100 workouts', rarity: 'epic' },
  { mark: 'PR', label: '10 PRs in a month', rarity: 'rare' },
  { mark: '30', label: '30-day streak', rarity: 'legendary' },
  { mark: 'G', label: 'Reached Gold', rarity: 'rare' },
  { mark: 'P', label: 'Reach Platinum', rarity: 'epic', locked: true },
  { mark: 'F', label: 'Founder', rarity: 'legendary', locked: true },
];

/** Profile accent choices are game colours (cosmetics), so they come from the rank hues. */
export const profileColors: RankTier[] = [
  'champion',
  'diamond',
  'gold',
  'platinum',
  'master',
  'bronze',
];

export const titles = ['The Grinder', 'Squat Specialist', 'Early Riser', 'Founder'] as const;
