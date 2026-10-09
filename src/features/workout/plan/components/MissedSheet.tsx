import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import type { PlanDay, PlanDoc } from '@/lib/plans';

import { formatPlanDate } from '../format';
import { usePlanActions } from '../hooks/usePlanActions';

interface MissedSheetProps {
  plan: PlanDoc;
  day: PlanDay | null;
  onClose: () => void;
}

/** A missed session: shift the rest of the plan along, or skip it. */
export function MissedSheet({ plan, day, onClose }: MissedSheetProps) {
  const actions = usePlanActions();
  return (
    <Sheet visible={!!day} onClose={onClose} title={day ? `Missed ${day.label}` : undefined}>
      {day ? (
        <View className="gap-md">
          <Text variant="body" tone="muted">
            {day.label} was planned for {formatPlanDate(day.date)}. Shift the week to do it today
            and move every later session along by the same number of days (the plan ends a little
            later), or skip it and carry on as planned.
          </Text>
          <Button
            label="Shift the week"
            fullWidth
            onPress={() => {
              actions.shiftWeek(plan, day.id);
              onClose();
            }}
          />
          <Button
            label="Skip it"
            variant="secondary"
            fullWidth
            onPress={() => {
              actions.skip(plan, day.id);
              onClose();
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
