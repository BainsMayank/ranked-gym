import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteCustomExercise, saveCustomExercise, type CustomExerciseInput } from './api';
import { exerciseKeys } from './keys';
import { deleteLocalExercise, upsertLocalExercise } from './repository';

/**
 * Creates or edits a custom exercise. Needs a connection for now (offline creation arrives with the
 * Phase 4 sync queue); the saved row is mirrored locally straight away.
 */
export function useSaveCustomExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomExerciseInput) => {
      const saved = await saveCustomExercise(input);
      await upsertLocalExercise(saved);
      return saved;
    },
    networkMode: 'online',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exerciseKeys.library }),
  });
}

export function useDeleteCustomExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteCustomExercise(id);
      await deleteLocalExercise(id);
    },
    networkMode: 'online',
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.library });
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.usage });
    },
  });
}
