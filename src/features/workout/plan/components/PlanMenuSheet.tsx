import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { Icon, ListGroup, ListItem, Sheet } from '@/components';
import type { PlanDoc } from '@/lib/plans';

import { usePlanActions } from '../hooks/usePlanActions';

interface PlanMenuSheetProps {
  plan: PlanDoc;
  visible: boolean;
  onClose: () => void;
}

/** Plan-level actions: pause or resume, start a new plan, end this one. */
export function PlanMenuSheet({ plan, visible, onClose }: PlanMenuSheetProps) {
  const router = useRouter();
  const actions = usePlanActions();
  const close = (then: () => void) => () => {
    onClose();
    then();
  };
  const end = () =>
    Alert.alert(
      'End this plan?',
      'Its workouts stay in your history. You can create a new plan any time.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'End plan',
          style: 'destructive',
          onPress: () => {
            actions.end(plan);
            router.back();
          },
        },
      ],
    );

  return (
    <Sheet visible={visible} onClose={onClose} title="Plan">
      <ListGroup>
        {plan.pausedAt ? (
          <ListItem
            title="Resume plan"
            subtitle="Sessions pick up from today; the plan ends later by the days paused."
            leading={<Icon name="play-outline" size={20} tone="text" />}
            onPress={close(() => actions.resume(plan))}
          />
        ) : (
          <ListItem
            title="Pause plan"
            subtitle="Ill, travelling or exams? Missed days won't pile up while paused."
            leading={<Icon name="pause-outline" size={20} tone="text" />}
            onPress={close(() => actions.pause(plan))}
          />
        )}
        <ListItem
          title="Create a new plan"
          leading={<Icon name="add-circle-outline" size={20} tone="text" />}
          onPress={close(() => router.push('/plan/new'))}
        />
        <ListItem
          title="End plan"
          leading={<Icon name="stop-circle-outline" size={20} tone="danger" />}
          onPress={close(end)}
        />
      </ListGroup>
    </Sheet>
  );
}
