import { useCallback, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import type { z } from 'zod';

type FormValues = Record<string, string>;
export type FieldErrors<V extends FormValues> = Partial<Record<keyof V, string>>;

/**
 * Minimal form state for text-first forms validated by zod. Values stay strings while typing; the
 * schema turns them into typed output. A field shows its error once it has been blurred or after a
 * submit attempt, so people aren't scolded mid-word.
 */
export function useZodForm<V extends FormValues, Out>(schema: z.ZodType<Out>, initial: V) {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => schema.safeParse(values), [schema, values]);

  const allErrors = useMemo(() => {
    const out: FieldErrors<V> = {};
    if (result.success) return out;
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof V | undefined;
      if (field !== undefined && out[field] === undefined) out[field] = issue.message;
    }
    return out;
  }, [result]);

  const errors = useMemo(() => {
    const out: FieldErrors<V> = {};
    for (const key of Object.keys(allErrors) as (keyof V)[]) {
      if (submitted || touched[key]) out[key] = allErrors[key];
    }
    return out;
  }, [allErrors, submitted, touched]);

  const setValue = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const blur = useCallback((key: keyof V) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  /**
   * Shows every error; calls `onValid` with the parsed output only if the form is valid. On failure
   * the keyboard closes so messages under the fields aren't hidden behind it.
   */
  const submit = useCallback(
    (onValid: (data: Out) => void) => {
      setSubmitted(true);
      if (result.success) onValid(result.data);
      else Keyboard.dismiss();
    },
    [result],
  );

  /** Props for an `Input`: value, change, blur and the visible error. */
  const field = useCallback(
    <K extends keyof V>(key: K) => ({
      value: values[key],
      onChangeText: (text: string) => setValue(key, text as V[K]),
      onBlur: () => blur(key),
      error: errors[key],
    }),
    [values, errors, setValue, blur],
  );

  return {
    values,
    errors,
    isValid: result.success,
    data: result.success ? result.data : undefined,
    setValue,
    blur,
    submit,
    field,
  };
}
