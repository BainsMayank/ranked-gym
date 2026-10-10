import { Storage } from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Button, Sheet, Text } from '@/components';
import { useUserId } from '@/lib/auth';
import { useClock, type Goal } from '@/lib/insights';
import { motion } from '@/theme';

export function GoalCelebration({ goals }: { goals: readonly Goal[] }) {
  const userId = useUserId();
  const now = useClock();
  const [seen, setSeen] = useState(
    () => new Set(Storage.getAllKeysSync().filter((k) => k.startsWith(`goal-seen.${userId}.`))),
  );
  const goal = goals.find(
    (g) =>
      g.status === 'achieved' &&
      g.achieved_at &&
      Date.parse(g.achieved_at) > now - 300000 &&
      !seen.has(`goal-seen.${userId}.${g.id}`),
  );
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (goal && !reduced) {
      scale.set(0.97);
      scale.set(withSpring(1, motion.press));
    }
  }, [goal, reduced, scale]);
  const close = () => {
    if (goal) {
      const key = `goal-seen.${userId}.${goal.id}`;
      Storage.setItemSync(key, '1');
      setSeen((s) => new Set([...s, key]));
    }
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Sheet visible={!!goal} onClose={close} title="Goal achieved">
      <Animated.View style={style}>
        <Text variant="title">{goal?.target.title}</Text>
        <Text tone="muted">Your work added up. This milestone is saved.</Text>
        {goal?.auto_post ? (
          <Text variant="caption" tone="muted">
            Shared to your feed using your profile visibility.
          </Text>
        ) : null}
        <Button label="Keep going" onPress={close} />
      </Animated.View>
    </Sheet>
  );
}
