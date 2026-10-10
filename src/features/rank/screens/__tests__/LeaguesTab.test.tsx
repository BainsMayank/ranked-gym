import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { LeagueHome, LeagueStandings } from '@/lib/leagues';

import { LeaguesScreen } from '../LeaguesScreen';

/** Leagues tab: group standings with zones, LP breakdown, Monday results, joining and signed-out. */

const mockMarkSeen = jest.fn();
const mockSchedule = jest.fn();
let mockHome: LeagueHome | null = null;
let mockSignedIn = true;

const mockStandings: LeagueStandings = {
  leagueId: 'l1',
  kind: 'ranked',
  name: 'Contender league',
  division: 'contender',
  scoring: 'lp',
  status: 'open',
  startsAt: '2026-10-04T18:30:00Z',
  endsAt: '2026-10-11T18:30:00Z',
  inviteCode: null,
  scoringRankKey: null,
  isOwner: false,
  members: 5,
  promote: 1,
  demote: 1,
  rows: [
    {
      position: 1,
      userId: 'a',
      points: 300,
      displayName: 'Neha K.',
      username: null,
      avatarUrl: null,
      isYou: false,
      outcome: null,
      zone: 'promotion',
    },
    {
      position: 2,
      userId: 'me',
      points: 215,
      displayName: 'Demo Lifter',
      username: 'demo',
      avatarUrl: null,
      isYou: true,
      outcome: null,
      zone: null,
    },
    {
      position: 3,
      userId: 'b',
      points: 120,
      displayName: 'Kabir M.',
      username: null,
      avatarUrl: null,
      isYou: false,
      outcome: null,
      zone: null,
    },
    {
      position: 4,
      userId: 'c',
      points: 80,
      displayName: 'Ishita S.',
      username: null,
      avatarUrl: null,
      isYou: false,
      outcome: null,
      zone: null,
    },
    {
      position: 5,
      userId: 'd',
      points: 0,
      displayName: 'Rohan V.',
      username: null,
      avatarUrl: null,
      isYou: false,
      outcome: null,
      zone: 'demotion',
    },
  ],
};

const mockBaseHome: LeagueHome = {
  season: { id: 2, number: 2, startsAt: '2026-09-07T18:30:00Z', endsAt: '2099-11-02T18:30:00Z' },
  week: { id: 9, weekNo: 5, startsAt: '2026-10-04T18:30:00Z', endsAt: '2099-10-11T18:30:00Z' },
  division: 'contender',
  league: {
    id: 'l1',
    name: 'Contender league',
    division: 'contender',
    members: 5,
    position: 2,
    points: 215,
    promote: 1,
    demote: 1,
  },
  breakdown: {
    workouts: 120,
    planned: 15,
    prs: 30,
    rankUps: 0,
    baseline: 50,
    strength: 0,
    total: 215,
    counts: { days: 3, planned: 1, prs: 3, rankUps: 0, sets: 40, baselineSets: 30, scoreGain: 0 },
  },
  result: null,
  custom: [],
};

// Milestone sharing (Phase 9) talks to the server; these screens only need its shape.
jest.mock('@/lib/social/hooks', () => ({
  useMilestoneMode: () => ({ data: 'ask' }),
  useMilestonePost: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/lib/leagues/notifications', () => ({
  scheduleLeagueResults: (...a: unknown[]) => mockSchedule(...a),
}));
jest.mock('@/lib/ranks/hooks', () => ({
  ...jest.requireActual('@/lib/ranks/hooks'),
  useServerReads: () => mockSignedIn,
}));
jest.mock('@/lib/leagues/hooks', () => ({
  ...jest.requireActual('@/lib/leagues/hooks'),
  useLeagueHome: () => ({ data: mockHome, isLoading: false, isError: false, refetch: jest.fn() }),
  useLeagueStandings: (id: string | undefined) => ({
    data: id ? mockStandings : undefined,
    isLoading: false,
  }),
  useLeagueChallenges: () => ({
    data: [
      {
        id: 'c1',
        kind: 'most_reps',
        title: 'Most pull-ups this week',
        rankKey: 'pullUp',
        target: null,
        startsAt: 'a',
        endsAt: 'b',
        mine: 42,
        completedBy: 0,
        leaders: [{ displayName: 'Neha K.', value: 60, isYou: false }],
      },
    ],
    isLoading: false,
  }),
  useLeagueResultsPref: () => ({ data: true }),
  useMarkResultSeen: () => ({ mutate: mockMarkSeen }),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const show = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <LeaguesScreen />
    </SafeAreaProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedIn = true;
  mockHome = mockBaseHome;
});
afterEach(async () => {
  await act(async () => undefined);
});

it('shows my group with promotion and demotion zones, my LP and challenges', async () => {
  await show();
  expect(screen.getByText('Contender league')).toBeOnTheScreen();
  expect(screen.getByText(/Season 2 · week 5 of 8/)).toBeOnTheScreen();
  expect(screen.getByLabelText('2. You, 215 LP')).toBeOnTheScreen();
  expect(screen.getByText('Promotion zone above')).toBeOnTheScreen();
  expect(screen.getByText('Demotion zone')).toBeOnTheScreen();
  expect(screen.getByText('Your League Points')).toBeOnTheScreen();
  expect(screen.getByText('40 sets vs your 30 a week')).toBeOnTheScreen();
  expect(screen.getByText('Leader: Neha K. with 60')).toBeOnTheScreen();
  expect(screen.getByText('League chat')).toBeOnTheScreen();
  expect(mockSchedule).toHaveBeenCalledWith('2099-10-11T18:30:00Z', true);
});

it('shows Monday’s result once and marks it seen', async () => {
  mockHome = {
    ...mockBaseHome,
    result: {
      leagueId: 'l0',
      weekNo: 4,
      seasonNumber: 2,
      division: 'rookie',
      position: 2,
      points: 300,
      outcome: 'promoted',
      members: 28,
      newDivision: 'contender',
    },
  };
  const user = userEvent.setup();
  await show();
  expect(screen.getByText('Promoted to Contender')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'On to this week' }));
  expect(mockMarkSeen).toHaveBeenCalledWith('l0');
});

it('teaches how to join when not placed this week', async () => {
  mockHome = { ...mockBaseHome, league: null };
  await show();
  expect(screen.getByText('Finish a workout to join this week’s league')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Create league' })).toBeOnTheScreen();
});

it('asks for an account in the signed-out preview', async () => {
  mockSignedIn = false;
  await show();
  expect(screen.getByText('Sign in to see your leagues')).toBeOnTheScreen();
});
