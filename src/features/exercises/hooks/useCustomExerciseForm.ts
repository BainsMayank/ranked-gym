import { onlineManager } from '@tanstack/react-query';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import { useSaveCustomExercise, type Exercise, type Muscle } from '@/lib/exercises';

import { validate, type CustomExerciseValues } from '../customExerciseForm';

/**
 * State for creating or editing a custom exercise. Errors show after the first save attempt (or once
 * the name field is left), and a muscle chosen as primary drops out of secondary.
 */
export function useCustomExerciseForm(
  initial: CustomExerciseValues,
  editingId: string | undefined,
  onSaved: (exercise: Exercise) => void,
) {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const save = useSaveCustomExercise();

  const { data, errors: allErrors } = validate(values);
  const errors = submitted ? allErrors : nameTouched ? { name: allErrors.name } : {};

  const set = <K extends keyof CustomExerciseValues>(key: K, value: CustomExerciseValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const setPrimary = (primary: Muscle[]) =>
    setValues((prev) => ({
      ...prev,
      primary,
      secondary: prev.secondary.filter((m) => !primary.includes(m)),
    }));

  const submit = () => {
    setSubmitted(true);
    setServerError(null);
    if (!data) return Keyboard.dismiss();
    if (!onlineManager.isOnline()) {
      setServerError('You’re offline. Custom exercises need a connection for now.');
      return;
    }
    save.mutate(
      { id: editingId, ...data },
      {
        onSuccess: onSaved,
        onError: () => setServerError('Couldn’t save. Check your connection and try again.'),
      },
    );
  };

  return {
    values,
    errors,
    /** The message above the save button: a server problem, or a nudge to fields scrolled out of view. */
    footerError: serverError ?? (submitted && !data ? 'Fix the fields marked in red above.' : null),
    saving: save.isPending,
    setName: (name: string) => set('name', name),
    blurName: () => setNameTouched(true),
    setEquipment: (equipment: string) => set('equipment', equipment),
    setLogType: (logType: string) => set('logType', logType),
    setPrimary,
    setSecondary: (secondary: Muscle[]) => set('secondary', secondary),
    submit,
  };
}
