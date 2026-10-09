import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Sheet, Text } from '@/components';
import { addDays, mondayOf, type PlanDay } from '@/lib/plans';

import { formatPlanDate } from '../format';

interface MoveSheetProps {
  day: PlanDay | null;
  today: string;
  /** Returns an error to show, or a warning (already moved). */
  onMove: (date: string) => { error?: string; warning?: string };
  onClose: () => void;
}

/** Move a session to another day this week (today or later). */
export function MoveSheet({ day, today, onMove, onClose }: MoveSheetProps) {
  const [message, setMessage] = useState<{ text: string; tone: 'danger' | 'warning' } | null>(null);
  const monday = day ? mondayOf(day.date < today ? today : day.date) : today;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d >= today);
  const pick = (date: string) => {
    const result = onMove(date);
    if (result.error) setMessage({ text: result.error, tone: 'danger' });
    else if (result.warning) setMessage({ text: `Moved. ${result.warning}`, tone: 'warning' });
    else close();
  };
  const close = () => {
    setMessage(null);
    onClose();
  };
  return (
    <Sheet visible={!!day} onClose={close} title={day ? `Move ${day.label}` : undefined}>
      <View className="gap-md">
        <View className="flex-row flex-wrap gap-sm">
          {dates.map((d) => (
            <Chip
              key={d}
              label={formatPlanDate(d)}
              selected={d === day?.date}
              onPress={() => pick(d)}
            />
          ))}
        </View>
        {message ? (
          <Text variant="caption" tone={message.tone} accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        ) : null}
        {message?.tone === 'warning' ? (
          <Button label="Done" variant="secondary" fullWidth onPress={close} />
        ) : null}
      </View>
    </Sheet>
  );
}
