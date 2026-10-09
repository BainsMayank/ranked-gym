import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePlanDraft } from '../../plan/draft';
import { CreatePlanScreen } from '../CreatePlanScreen';

/** The questionnaire: prefilled from onboarding, one question per screen, back, skip, generate. */

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('@/lib/profile', () => ({
  ...jest.requireActual('@/lib/profile/options'),
  useProfile: () => ({
    data: { primary_goal: 'curvier', experience_level: 'advanced' },
    isPending: false,
  }),
}));
jest.mock('@/lib/plans', () => jest.requireActual('@/lib/plans/engine'));
jest.mock('@/lib/exercises', () => ({
  ...jest.requireActual('@/lib/exercises/taxonomy'),
  useExercises: () => ({ data: [] }),
  useExercisePicker: () => jest.fn(async () => []),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CreatePlanScreen />
    </SafeAreaProvider>,
  );
}

const cont = () => screen.getByRole('button', { name: 'Continue' });

afterEach(async () => {
  await act(async () => usePlanDraft.getState().goTo(0));
});

it('starts on the goal and level from onboarding', async () => {
  await renderScreen();
  expect(screen.getByRole('radio', { name: 'Get curvier' })).toBeSelected();
  await userEvent.setup().press(cont());
  expect(screen.getByText('How long have you been training?')).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Advanced' })).toBeSelected();
});

it('goes back a question, and leaves from the first one', async () => {
  await renderScreen();
  const user = userEvent.setup();
  await user.press(cont());
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('What do you want to achieve?')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockBack).toHaveBeenCalled();
});

it('previews the split from the schedule, skips the optional question and generates', async () => {
  await renderScreen();
  const user = userEvent.setup();
  await user.press(cont()); // goal
  await user.press(cont()); // level
  await user.press(screen.getByRole('radio', { name: 'Specific days' }));
  await user.press(screen.getByRole('checkbox', { name: 'Tuesday' }));
  expect(screen.getByText(/Some days are back to back/)).toBeTruthy();
  expect(
    screen.getByText(/Lower \(glutes\) \/ upper: Mon Glutes and hamstrings · Tue Upper A/),
  ).toBeTruthy();
  await user.press(cont()); // schedule
  await user.press(cont()); // length
  await user.press(cont()); // equipment
  await user.press(screen.getByRole('button', { name: 'Skip' }));
  expect(screen.getByText('How long should the plan run?')).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Generate my plan' }));
  expect(mockPush).toHaveBeenCalledWith('/plan/preview');
  expect(usePlanDraft.getState().input.schedule).toEqual({
    kind: 'weekdays',
    weekdays: [0, 1, 2, 4],
  });
});
