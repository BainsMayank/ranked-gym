import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import type { Exercise } from '@/lib/exercises';
import { blankRoutine, type RoutineDoc } from '@/lib/routines';
import { exercise, set } from '@/lib/routines/__fixtures__/routine';

import { ExerciseCard } from '../components/ExerciseCard';
import { EditorEnvProvider, type EditorEnv } from '../EditorEnv';
import { useRoutineEditor } from '../store';

const squat: Exercise = {
  id: 'squat',
  slug: 'barbell-back-squat',
  name: 'Barbell back squat',
  aliases: [],
  category: 'strength',
  equipment: 'barbell',
  mechanic: 'compound',
  logType: 'weight_reps',
  unilateral: false,
  instructions: [],
  tips: [],
  commonMistakes: [],
  mediaUrl: null,
  metValue: 5,
  isRankable: true,
  rankKey: null,
  createdBy: null,
  updatedAt: 'now',
  muscles: [{ muscle: 'quads', role: 'primary', weight: 1 }],
};

const env: EditorEnv = {
  exercises: new Map([[squat.id, squat]]),
  unit: 'kg',
  effort: 'rir',
  barKg: 20,
  defaultRestSec: 120,
};

function loadDoc(): RoutineDoc {
  const doc: RoutineDoc = {
    ...blankRoutine('routine', 'now'),
    name: 'Leg day',
    exercises: [
      exercise({
        id: 'e1',
        exerciseId: 'squat',
        sets: [
          set({ id: 's1', setType: 'top', reps: 5, weightKg: 140 }),
          set({ id: 's2', setType: 'backoff', reps: 8 }),
        ],
      }),
    ],
  };
  useRoutineEditor.getState().load(doc, doc);
  return doc;
}

async function renderCard() {
  const doc = useRoutineEditor.getState().doc!;
  return render(
    <EditorEnvProvider value={env}>
      <ExerciseCard
        exercise={doc.exercises[0]!}
        superset={null}
        selecting={false}
        selected={false}
      />
    </EditorEnvProvider>,
  );
}

const currentSets = () => useRoutineEditor.getState().doc!.exercises[0]!.sets;

describe('ExerciseCard', () => {
  beforeEach(() => {
    useRoutineEditor.getState().reset();
    loadDoc();
  });

  it('shows the set marks and the columns for a weighted lift', async () => {
    await renderCard();
    expect(screen.getByText('T')).toBeOnTheScreen();
    expect(screen.getByText('B')).toBeOnTheScreen();
    // Column headers are decorative (each cell carries its own label).
    expect(screen.getByText('kg', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('RIR', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('commits a back-off load as a percentage of the top set', async () => {
    await renderCard();
    const cell = screen.getByLabelText('Barbell back squat, set 2, kg');
    await fireEvent.changeText(cell, '85%');
    await fireEvent(cell, 'endEditing', { nativeEvent: { text: '85%' } });
    expect(currentSets()[1]).toMatchObject({
      weightMode: 'percent_of_top_set',
      weightPercent: 85,
      weightKg: null,
    });
  });

  it('commits what the input reports even if typing and blur land in one tick', async () => {
    await renderCard();
    const cell = screen.getByLabelText('Barbell back squat, set 2, Reps');
    // No changeText first: the native event carries the final text.
    await fireEvent(cell, 'endEditing', { nativeEvent: { text: '8-10' } });
    expect(currentSets()[1]).toMatchObject({ targetType: 'rep_range', repsMin: 8, repsMax: 10 });
  });

  it('rejects invalid text and keeps the old value', async () => {
    await renderCard();
    const cell = screen.getByLabelText('Barbell back squat, set 1, RIR');
    await fireEvent(cell, 'endEditing', { nativeEvent: { text: '9' } });
    expect(currentSets()[0]!.rir).toBeNull();
  });

  it('adds a set copying the last one, and undo removes it', async () => {
    const user = userEvent.setup();
    await renderCard();
    await user.press(screen.getByRole('button', { name: 'Add set to Barbell back squat' }));
    expect(currentSets()).toHaveLength(3);
    expect(currentSets()[2]).toMatchObject({ setType: 'backoff', reps: 8 });
    expect(currentSets()[2]!.id).not.toBe('s2');
    useRoutineEditor.getState().undo();
    expect(currentSets()).toHaveLength(2);
  });

  it('generates warm-ups ramping to the top set', async () => {
    const user = userEvent.setup();
    await renderCard();
    await user.press(screen.getByRole('button', { name: 'Warm-ups' }));
    expect(currentSets().map((s) => [s.setType, s.weightKg])).toEqual([
      ['warmup', 55],
      ['warmup', 77.5],
      ['warmup', 97.5],
      ['warmup', 120],
      ['top', 140],
      ['backoff', null],
    ]);
  });
});
