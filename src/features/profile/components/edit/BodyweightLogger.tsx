import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Input, Text } from '@/components';
import { useZodForm } from '@/lib/forms/useZodForm';
import { bodyweightSchema, useLatestBodyweight, useLogBodyweight } from '@/lib/profile';
import { formatWeight, type WeightUnit } from '@/lib/units';

import { profileErrorMessage } from '../../api/profileErrors';

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** Shows the latest weigh-in and logs a new one (stored in kg). */
export function BodyweightLogger({ unit }: { unit: WeightUnit }) {
  const latest = useLatestBodyweight();
  const log = useLogBodyweight();
  const schema = useMemo(() => z.object({ weight: bodyweightSchema(unit) }), [unit]);
  const form = useZodForm(schema, { weight: '' });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const submit = () =>
    form.submit(async ({ weight }) => {
      setMessage(null);
      try {
        await log.mutateAsync({ weightKg: weight });
        form.setValue('weight', '');
        setMessage({ text: `Logged ${formatWeight(weight, unit)}.`, error: false });
      } catch (e) {
        setMessage({ text: profileErrorMessage(e), error: true });
      }
    });

  return (
    <View className="gap-sm">
      <View className="flex-row items-start gap-sm">
        <Input
          label={`Today's bodyweight (${unit})`}
          placeholder={latest.data ? String(formatWeight(latest.data.weight_kg, unit)) : ''}
          keyboardType="decimal-pad"
          maxLength={6}
          className="flex-1"
          {...form.field('weight')}
        />
        <Button
          label="Log"
          variant="secondary"
          loading={log.isPending}
          onPress={submit}
          className="mt-6"
        />
      </View>
      <Text
        variant="caption"
        tone={message?.error ? 'danger' : message ? 'success' : 'muted'}
        accessibilityLiveRegion="polite"
      >
        {message?.text ??
          (latest.data
            ? `Last weigh-in: ${formatWeight(latest.data.weight_kg, unit)} on ${dateFormat.format(new Date(latest.data.logged_at))}`
            : 'No weigh-ins yet.')}
      </Text>
    </View>
  );
}
