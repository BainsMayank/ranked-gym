import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Exercise } from '@/lib/exercises';

import { useRoutineEditor } from '../../editor/store';
import { RoutineBuilderScreen } from '../RoutineBuilderScreen';

/**
 * The editor end to end with its data sources mocked: picking exercises, making a superset with
 * long-press selection, reordering with screen-reader actions, and the unsaved-changes guard.
 */

function mockExercise(id: string, name: string): Exercise {
  return {
    id,
    slug: id,
    name,
    aliases: [],
    category: 'strength',
    equipment: 'machine',
    mechanic: 'isolation',
    logType: 'weight_reps',
    unilateral: false,
    instructions: [],
    tips: [],
    commonMistakes: [],
    mediaUrl: null,
    metValue: 3.5,
    isRankable: false,
    rankKey: null,
    createdBy: null,
    updatedAt: 'now',
    muscles: [{ muscle: id === 'ext' ? 'quads' : 'hamstrings', role: 'primary', weight: 1 }],
  };
}

const mockLibrary = [mockExercise('ext', 'Leg extension'), mockExercise('curl', 'Lying leg curl')];
const mockPick = jest.fn(async () => mockLibrary);
let mockPreventRemove: { prevent: boolean; callback?: (e: { data: { action: unknown } }) => void } =
  { prevent: false };
const mockSave = jest.fn(async () => undefined);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'new' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (prevent: boolean, callback: (e: { data: { action: unknown } }) => void) => {
    mockPreventRemove = { prevent, callback };
  },
}));
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
});
jest.mock('@/lib/exercises', () => ({
  ...jest.requireActual('@/lib/exercises/taxonomy'),
  ...jest.requireActual('@/lib/exercises/types'),
  useExercises: () => ({ data: mockLibrary }),
  useExercisePicker: () => mockPick,
}));
jest.mock('@/lib/profile', () => ({
  useProfile: () => ({ data: { units: 'kg' } }),
  useTrainingSettings: () => ({
    effort_metric: 'rir',
    rest_timer_default_sec: 120,
    bar_weight_kg: 20,
  }),
}));
jest.mock('@/lib/routines/repository', () => ({
  loadDraft: jest.fn(async () => null),
  saveDraft: jest.fn(async () => undefined),
  deleteDraft: jest.fn(async () => undefined),
}));
jest.mock('@/lib/routines/hooks', () => ({
  useRoutineDoc: () => ({ data: undefined, isFetched: false }),
  useSaveRoutine: () => ({ mutateAsync: mockSave, isPending: false }),
  useDeleteRoutine: () => ({ mutate: jest.fn() }),
  useRoutineFolders: () => ({ data: [] }),
  useSaveFolder: () => ({ mutateAsync: jest.fn() }),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const order = () =>
  useRoutineEditor
    .getState()
    .doc!.exercises.map((e) => mockLibrary.find((x) => x.id === e.exerciseId)!.name);

async function renderWithTwoExercises() {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RoutineBuilderScreen />
    </SafeAreaProvider>,
  );
  await user.press(await screen.findByRole('button', { name: 'Add exercises' }));
  await screen.findByText('Leg extension');
  return user;
}

describe('RoutineBuilderScreen', () => {
  beforeEach(() => {
    useRoutineEditor.getState().reset();
    mockPick.mockClear();
  });

  it('adds exercises from the picker with three sets each', async () => {
    await renderWithTwoExercises();
    expect(mockPick).toHaveBeenCalledWith({ multiple: true });
    expect(screen.getByText('Lying leg curl')).toBeOnTheScreen();
    expect(useRoutineEditor.getState().doc!.exercises.map((e) => e.sets.length)).toEqual([3, 3]);
    // Isolation lifts rest three quarters of the user's 2:00 default.
    expect(useRoutineEditor.getState().doc!.exercises.map((e) => e.restSeconds)).toEqual([90, 90]);
    // The live summary counts every new set as a working set.
    expect(screen.getByText(/6 sets · 6 working/)).toBeOnTheScreen();
  });

  it('makes a superset from two long-pressed exercises', async () => {
    const user = await renderWithTwoExercises();
    // A long press only (userEvent's release would also count as a tap on the now-selectable card).
    await fireEvent(screen.getByLabelText('Leg extension, Quads'), 'longPress');
    await user.press(screen.getByRole('checkbox', { name: 'Lying leg curl, Hamstrings' }));
    await user.press(screen.getByRole('button', { name: 'Make superset' }));
    expect(await screen.findByText('A1 · Superset')).toBeOnTheScreen();
    expect(screen.getByText('A2 · Superset')).toBeOnTheScreen();
    expect(screen.getByText('No rest to next')).toBeOnTheScreen();
  });

  it('reorders exercises with the Move down action', async () => {
    const user = await renderWithTwoExercises();
    await user.press(screen.getByRole('button', { name: 'Routine options' }));
    await user.press(await screen.findByRole('button', { name: 'Reorder exercises' }));
    const row = await screen.findByLabelText('Leg extension');
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'moveDown' } });
    expect(order()).toEqual(['Lying leg curl', 'Leg extension']);
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderWithTwoExercises();
    expect(mockPreventRemove.prevent).toBe(true);
    await act(async () => mockPreventRemove.callback?.({ data: { action: { type: 'GO_BACK' } } }));
    expect(await screen.findByText('Save your changes?')).toBeOnTheScreen();
  });
});
