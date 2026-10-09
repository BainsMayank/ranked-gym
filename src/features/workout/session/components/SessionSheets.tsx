import { useExercisePicker } from '@/lib/exercises';

import { replaceExercise } from '../actions';
import { useSessionStore } from '../store';
import { ExerciseActionsSheet } from './ExerciseActionsSheet';
import { PlatesSheet } from './PlatesSheet';
import { RestSheet } from './RestSheet';
import { RestTimeSheet } from './RestTimeSheet';
import { SetActionsSheet } from './SetActionsSheet';
import { TextEntrySheet } from './TextEntrySheet';

/** Every sheet the logging screen can open (one at a time, driven by the session's `sheet`). */
export function SessionSheets() {
  const store = useSessionStore();
  const pick = useExercisePicker();

  const replace = async (exerciseId: string) => {
    const [next] = await pick({ multiple: false });
    if (next) store.getState().apply((d) => replaceExercise(d, exerciseId, next));
  };

  return (
    <>
      <RestSheet />
      <PlatesSheet />
      <ExerciseActionsSheet onReplace={(id) => void replace(id)} />
      <SetActionsSheet />
      <TextEntrySheet />
      <RestTimeSheet />
    </>
  );
}
