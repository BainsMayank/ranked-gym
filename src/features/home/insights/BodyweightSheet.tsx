import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Sheet, Text } from '@/components';
import { useLogBodyweight, useProfile } from '@/lib/profile';
import { errorMessage } from '@/lib/sync/types';
import { useSyncStatusStore } from '@/lib/sync/status';
import { useAuthStore } from '@/lib/auth/authStore';
import { toKg } from '@/lib/units';

export function BodyweightSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [value, setValue] = useState('');
  const log = useLogBodyweight();
  const { data: profile } = useProfile();
  const preview = useAuthStore((s) => s.preview && !s.session);
  const online = useSyncStatusStore((s) => s.online) || preview;
  const unit = profile?.units ?? 'kg';
  const kg = toKg(Number(value), unit);
  const valid = Number.isFinite(kg) && kg >= 20 && kg <= 400;
  return (
    <Sheet visible={visible} onClose={onClose} title="Log bodyweight">
      <View className="gap-lg">
        <Input
          label={`Bodyweight (${unit})`}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          autoComplete="off"
          helperText="A weigh-in helps show your trend and rank your lifts."
        />
        {!online ? (
          <Text tone="muted">Connect to save a weigh-in. Your entry stays here.</Text>
        ) : null}
        {log.isError ? <Text tone="danger">{errorMessage(log.error)}</Text> : null}
        <Button
          label="Save weigh-in"
          disabled={!valid || !online}
          loading={log.isPending}
          onPress={() =>
            log.mutate(
              { weightKg: kg },
              {
                onSuccess: () => {
                  setValue('');
                  onClose();
                },
              },
            )
          }
        />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
