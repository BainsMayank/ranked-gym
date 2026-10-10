import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { evenThresholds } from '@/lib/game/engine/tiers';
import {
  ladderPosition,
  type CurrentRank,
  type LiftBest,
  type RankLadder,
  type RankLift,
  type RankPrediction,
  type RecordEntry,
} from '@/lib/ranks';

import { TIER_FLOORS } from '../../../../../supabase/seed/standards.ts';
import { AnalysisScreen } from '../AnalysisScreen';
import { BodyMapScreen } from '../BodyMapScreen';
import { MyRanksScreen } from '../MyRanksScreen';
import { RecordsScreen } from '../RecordsScreen';

/** Rank sub-tabs on server data: real data, teaching empty states and the signed-out preview. */

const mockLadder: RankLadder = {
  version: 1,
  thresholds: evenThresholds(TIER_FLOORS),
  maxScore: 1000,
  windowDays: 180,
  inactiveDays: 60,
};
const row = (scope: CurrentRank['scope'], key: string, score: number): CurrentRank => {
  const p = ladderPosition(score, mockLadder);
  return {
    scope,
    key,
    score,
    rank: p.division ? { tier: p.tier, division: p.division } : { tier: p.tier },
    status: 'ranked',
    lastSetAt: '2026-10-01T10:00:00Z',
    inactive: false,
    details: { lifts: 6, needLifts: 5, regions: 5, needRegions: 4 },
  };
};
const RANKS: CurrentRank[] = [
  row('overall', 'overall', 470),
  row('weightlifting', 'weightlifting', 480),
  row('calisthenics', 'calisthenics', 430),
  row('lift', 'benchPress', 436),
  row('lift', 'pullUp', 357),
  row('lift', 'backSquat', 520),
  row('region', 'chest', 436),
  row('region', 'legs', 520),
  row('region', 'back', 357),
  row('muscle', 'mid_lower_chest', 436),
];
const mockLifts: RankLift[] = [
  { rankKey: 'benchPress', name: 'Bench press', discipline: 'weightlifting' },
  { rankKey: 'backSquat', name: 'Back squat', discipline: 'weightlifting' },
  { rankKey: 'pullUp', name: 'Pull-up', discipline: 'calisthenics' },
  { rankKey: 'deadlift', name: 'Deadlift', discipline: 'weightlifting' },
];
const mockPrediction: RankPrediction = {
  rankKey: 'benchPress',
  score: 436,
  next: { tier: 'gold', division: 2 },
  targetScore: 450,
  e1rmKg: 86,
  loads: [
    { reps: 1, kg: 86 },
    { reps: 5, kg: 75 },
  ],
  reps: null,
  addedLoads: [],
  seconds: null,
  eta: { status: 'ok', days: 21 },
  needsBodyweight: false,
  bodyweightStale: false,
};
const mockBest: LiftBest = {
  rankKey: 'benchPress',
  exerciseName: 'Barbell bench press',
  logType: 'weight_reps',
  weightKg: 72.5,
  reps: 5,
  durationSec: null,
  e1rm: 83.1,
  bodyweightKg: 74,
  achievedAt: '2026-10-01T10:00:00Z',
};
const RECORD = (
  kind: RecordEntry['kind'],
  value: number,
  previous: number | null,
  at: string,
): RecordEntry => ({
  exerciseId: 'ex-bench',
  exerciseName: 'Barbell bench press',
  rankKey: 'benchPress',
  logType: 'weight_reps',
  kind,
  weightKg: null,
  value,
  previousValue: previous,
  achievedAt: at,
  workoutId: 'w1',
  workoutName: 'Push day',
  set: { reps: 5, weightKg: 72.5, durationSec: null },
});

let mockSignedIn = true;
let mockRanks: CurrentRank[] = RANKS;
let mockRecords: RecordEntry[] = [];
const mockQ = <T,>(data: T) => ({ data, isLoading: false, isError: false, refetch: jest.fn() });

// Milestone sharing (Phase 9) talks to the server; these screens only need its shape.
jest.mock('@/lib/social/hooks', () => ({
  useMilestoneMode: () => ({ data: 'ask' }),
  useMilestonePost: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { units: 'kg', sex_for_standards: 'male' } }),
}));
jest.mock('@/lib/exercises/useExerciseLibrary', () => ({
  ...jest.requireActual('@/lib/exercises/useExerciseLibrary'),
  useExercises: () => ({
    data: [
      {
        createdBy: null,
        rankKey: 'benchPress',
        muscles: [
          { muscle: 'mid_lower_chest', role: 'primary', weight: 1 },
          { muscle: 'triceps', role: 'secondary', weight: 0.5 },
        ],
      },
      {
        createdBy: null,
        rankKey: 'dumbbellBench',
        muscles: [{ muscle: 'mid_lower_chest', role: 'primary', weight: 1 }],
      },
    ],
  }),
}));
jest.mock('@/lib/ranks/hooks', () => ({
  ...jest.requireActual('@/lib/ranks/hooks'),
  useServerReads: () => mockSignedIn,
  useRanks: () => mockQ(mockRanks),
  useRankLadder: () => mockQ(mockLadder),
  useRankLifts: () => mockQ(mockLifts),
  useRankPredictions: () => mockQ(mockRanks.length ? [mockPrediction] : []),
  useLiftBests: () => mockQ(mockRanks.length ? [mockBest] : []),
  useRankHistory: () =>
    mockQ({
      snapshots: mockRanks.length
        ? [
            { at: '2026-08-01T10:00:00Z', score: 380, rank: { tier: 'silver', division: 1 } },
            { at: '2026-09-12T10:00:00Z', score: 470, rank: { tier: 'gold', division: 2 } },
          ]
        : [],
      events: mockRanks.length
        ? [
            {
              at: '2026-09-12T10:00:00Z',
              kind: 'rank_up',
              from: { tier: 'silver', division: 1 },
              to: { tier: 'gold', division: 3 },
              score: 410,
            },
          ]
        : [],
    }),
  useRankEvents: () => mockQ([]),
  usePersonalRecords: () => mockQ(mockRecords),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const show = (ui: ReactElement) =>
  render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);

beforeEach(() => {
  mockSignedIn = true;
  mockRanks = RANKS;
  mockRecords = [];
});
afterEach(async () => {
  await act(async () => undefined);
});

describe('My Ranks', () => {
  it('shows the overall rank, progression and every lift', async () => {
    await show(<MyRanksScreen />);
    expect(screen.getByText('Overall rank')).toBeOnTheScreen();
    expect(screen.getAllByText('Gold II').length).toBeGreaterThan(0);
    expect(screen.getByText('Rank progression')).toBeOnTheScreen();
    expect(screen.getByText(/Promoted to Gold III on 12 Sept/)).toBeOnTheScreen();
    expect(screen.getByText('Your lifts')).toBeOnTheScreen();
    expect(screen.getByText('Next: Gold II at 75 kg × 5')).toBeOnTheScreen();
    expect(screen.getByText('e1RM 83 kg · 1.12× bodyweight')).toBeOnTheScreen();
    expect(screen.getByText('Not ranked yet')).toBeOnTheScreen();
  });

  it('teaches placement when nothing is ranked', async () => {
    mockRanks = [];
    await show(<MyRanksScreen />);
    expect(screen.getByText('0 of 5 lifts ranked')).toBeOnTheScreen();
    expect(screen.getByText(/Log a bench press, squat, deadlift or pull-up/)).toBeOnTheScreen();
  });

  it('asks for an account in the signed-out preview', async () => {
    mockSignedIn = false;
    await show(<MyRanksScreen />);
    expect(screen.getByText('Sign in to see your ranks')).toBeOnTheScreen();
  });

  it('opens How ranks work', async () => {
    const user = userEvent.setup();
    await show(<MyRanksScreen />);
    await user.press(screen.getByRole('button', { name: 'How ranks work' }));
    expect(screen.getByText('Your best 180 days')).toBeOnTheScreen();
  });
});

describe('Body Map', () => {
  it('opens a muscle with the lifts behind it and its weakest link', async () => {
    const user = userEvent.setup();
    await show(<BodyMapScreen />);
    await user.press(screen.getByRole('button', { name: /^Mid\/lower chest, Gold III/ }));
    expect(screen.getByText('Built from')).toBeOnTheScreen();
    expect(screen.getByText('Weakest link')).toBeOnTheScreen();
  });
});

describe('Analysis', () => {
  it('shows predictions, distribution and balance', async () => {
    await show(<AnalysisScreen />);
    expect(screen.getByText('Next rank-ups')).toBeOnTheScreen();
    expect(screen.getByText(/Need 75 kg × 5/)).toBeOnTheScreen();
    expect(screen.getByText('Rank points by body region')).toBeOnTheScreen();
    expect(screen.getByText('Push : Pull')).toBeOnTheScreen();
  });

  it('teaches with empty states', async () => {
    mockRanks = [];
    await show(<AnalysisScreen />);
    expect(screen.getByText(/Log a bench press, squat or pull-up to see/)).toBeOnTheScreen();
    expect(screen.getByText(/Your first lift rank-up starts this chart/)).toBeOnTheScreen();
  });
});

describe('Records', () => {
  it('groups records by exercise and expands to the history', async () => {
    mockRecords = [
      RECORD('weight', 60, null, '2026-09-01T10:00:00Z'),
      RECORD('weight', 72.5, 60, '2026-10-01T10:00:00Z'),
    ];
    const user = userEvent.setup();
    await show(<RecordsScreen />);
    expect(screen.getByText('Barbell bench press')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Barbell bench press, 2 records' }));
    expect(screen.getByText(/Was 60 kg/)).toBeOnTheScreen();
    expect(screen.getByText('Baseline')).toBeOnTheScreen();
  });

  it('explains baselines before any records', async () => {
    await show(<RecordsScreen />);
    expect(screen.getByText('No records yet')).toBeOnTheScreen();
  });
});
