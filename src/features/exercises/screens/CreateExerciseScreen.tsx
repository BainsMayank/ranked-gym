import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components';
import { useExercise } from '@/lib/exercises';

import { CustomExerciseForm } from '../components/CustomExerciseForm';
import { initialValues } from '../customExerciseForm';

type Params = { id?: string; name?: string };

/** Create a custom exercise (`?name=` prefills it) or edit one (`?id=`). */
export function CreateExerciseScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<Params>();
  const { data: existing, isPending } = useExercise(id);

  if (id && isPending) {
    return (
      <Screen onBack={() => router.back()} edges={['top', 'bottom']}>
        {null}
      </Screen>
    );
  }

  return (
    <CustomExerciseForm
      key={existing?.id ?? 'new'}
      title={existing ? 'Edit exercise' : 'New exercise'}
      editingId={existing?.id}
      initial={initialValues(existing ?? null, name)}
      onClose={() => router.back()}
    />
  );
}
