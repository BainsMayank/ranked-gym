import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { haptics } from '@/lib/haptics';
import { fromKg } from '@/lib/units';
import { earlierSet, matchPrevious, setE1rm, suggestionFor } from '@/lib/workouts';

import { updateSet } from '../actions';
import { useKeypadDraft } from '../draft';
import {
  draftFor,
  fieldNames,
  logFieldsFor,
  parseDraft,
  patchFor,
  stepDraft,
  stepFor,
  suggestedValue,
  typeKey,
  valueOf,
} from '../fields';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore, type KeypadField, type KeypadTarget } from '../store';
import { KeypadKey } from './KeypadKey';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const;

/**
 * The logging keypad, docked under the list (the system keyboard never opens). Big keys, +/- steps
 * (2.5 kg or 5 lb on weight), the plate calculator, and Next to walk weight → reps → next set.
 */
export function NumericKeypad() {
  const store = useSessionStore();
  const env = useSessionEnv();
  const insets = useSafeAreaInsets();
  const target = useSession((s) => s.keypad);
  const exercise = useSession((s) => s.doc?.exercises.find((e) => e.id === target?.exerciseId));
  const draft = useKeypadDraft((s) => s.draft);
  const setDraft = useKeypadDraft((s) => s.set);
  if (!target || !exercise) return null;
  const index = exercise.sets.findIndex((s) => s.id === target.setId);
  const set = exercise.sets[index];
  if (!set) return null;

  const info = env.exercises.get(exercise.exerciseId);
  const logType = info?.logType ?? 'weight_reps';
  const previous = matchPrevious(exercise.sets, env.previous.get(exercise.exerciseId) ?? [])[index];
  const suggestion = suggestionFor(set, previous ?? null, earlierSet(exercise.sets, index));
  const field = target.field;
  const parsed = parseDraft(field, draft, env.unit);
  const step = stepFor(field, env.unit);

  const commit = (): boolean => {
    if (parsed === undefined) return false;
    if (parsed !== valueOf(set, field)) {
      store.getState().apply((d) => updateSet(d, exercise.id, set.id, patchFor(field, parsed)));
    }
    return true;
  };

  const goTo = (next: KeypadTarget | null) => {
    if (!next) return store.getState().openKeypad(null);
    const nextSet = exercise.sets.find((s) => s.id === next.setId) ?? set;
    setDraft(draftFor(next.field, valueOf(nextSet, next.field), env.unit));
    store.getState().openKeypad(next);
  };

  /** Weight → reps → the next set's first cell (effort is optional, so Next skips it). */
  const nextTarget = (): KeypadTarget | null => {
    const order: KeypadField[] = logFieldsFor(logType, env.effort).filter(
      (f) => f !== 'rir' && f !== 'rpe',
    );
    const at = order.indexOf(field);
    if (at >= 0 && at < order.length - 1) return { ...target, field: order[at + 1]! };
    const following = exercise.sets[index + 1];
    return following && order[0] ? { ...target, setId: following.id, field: order[0] } : null;
  };

  const live = setE1rm({
    ...set,
    weightKg:
      field === 'weight' && parsed !== undefined ? parsed : (set.weightKg ?? suggestion.weightKg),
    reps: field === 'reps' && parsed !== undefined ? parsed : (set.reps ?? suggestion.reps),
  });
  const stepLabel = field === 'time' ? '15s' : String(step);

  return (
    <View
      className="gap-sm border-t border-edge bg-surface px-md pt-sm"
      style={{ paddingBottom: insets.bottom + 8 }}
    >
      <View className="flex-row items-center gap-sm">
        <View className="flex-1">
          <Text variant="label" numberOfLines={1}>
            {fieldNames[field]} · set {index + 1}
          </Text>
          <Text variant="caption" tone="muted" numeric numberOfLines={1}>
            {live !== null ? `e1RM ${fromKg(live, env.unit, 0.5)} ${env.unit}` : (info?.name ?? '')}
          </Text>
        </View>
        <Button label="Done" variant="ghost" size="sm" onPress={() => commit() && goTo(null)} />
      </View>
      <View className="flex-row gap-sm">
        <View className="flex-1 flex-row flex-wrap gap-sm">
          {DIGITS.map((key) => (
            <KeypadKey
              key={key}
              label={key === 'back' ? undefined : key}
              icon={key === 'back' ? 'backspace-outline' : undefined}
              accessibilityLabel={key === 'back' ? 'Delete' : key === '.' ? 'Decimal point' : key}
              onPress={() => setDraft(typeKey(field, draft, key))}
            />
          ))}
        </View>
        <View className="w-24 gap-sm">
          <KeypadKey
            label={`−${stepLabel}`}
            wide
            accessibilityLabel={`Minus ${stepLabel}`}
            onPress={() => {
              haptics.selection();
              setDraft(
                stepDraft(field, draft, suggestedValue(suggestion, field, set), -1, env.unit),
              );
            }}
          />
          <KeypadKey
            label={`+${stepLabel}`}
            wide
            accessibilityLabel={`Plus ${stepLabel}`}
            onPress={() => {
              haptics.selection();
              setDraft(
                stepDraft(field, draft, suggestedValue(suggestion, field, set), 1, env.unit),
              );
            }}
          />
          <KeypadKey
            icon="barbell-outline"
            wide
            disabled={field !== 'weight' || info?.equipment !== 'barbell'}
            accessibilityLabel="Plate calculator"
            onPress={() =>
              store.getState().openSheet({
                kind: 'plates',
                targetKg: parsed ?? set.weightKg ?? suggestion.weightKg,
              })
            }
          />
          <KeypadKey
            label="Next"
            wide
            accessibilityLabel="Next value"
            onPress={() => commit() && goTo(nextTarget())}
          />
        </View>
      </View>
    </View>
  );
}
