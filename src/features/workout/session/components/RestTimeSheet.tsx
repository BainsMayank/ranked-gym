import { View } from 'react-native';

import { Chip, Sheet, Text } from '@/components';
import { formatRest, restPresets } from '@/lib/routines';

import { updateExercise } from '../actions';
import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';

/** Rest after each set of this exercise, for the rest of the session. */
export function RestTimeSheet() {
  const store = useSessionStore();
  const env = useSessionEnv();
  const sheet = useSession((s) => s.sheet);
  const id = sheet?.kind === 'restTime' ? sheet.exerciseId : null;
  const exercise = useSession((s) => s.doc?.exercises.find((e) => e.id === id));
  const close = () => store.getState().openSheet(null);
  const options = [0, ...restPresets];

  return (
    <Sheet visible={!!exercise} onClose={close} title="Rest timer">
      {exercise ? (
        <View className="gap-md pb-sm">
          <Text variant="caption" tone="muted">
            Rest after each set of {env.nameOf(exercise.exerciseId)}.
          </Text>
          <View className="flex-row flex-wrap gap-sm">
            {options.map((sec) => (
              <Chip
                key={sec}
                label={sec === 0 ? 'Off' : formatRest(sec)}
                selected={exercise.restSeconds === sec}
                onPress={() => {
                  store
                    .getState()
                    .apply((d) => updateExercise(d, exercise.id, { restSeconds: sec }));
                  close();
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
