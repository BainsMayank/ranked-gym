import { View } from 'react-native';

import { Card, ProgressBar, SectionHeader, Text } from '@/components';

import { recovery } from '../mocks';

const READY = 90;

/** Estimated recovery per muscle. Ready muscles in success, recovering ones in warning. */
export function RecoveryCard() {
  const ready = recovery.filter((r) => r.percent >= READY).map((r) => r.muscle);
  return (
    <Card className="gap-md">
      <SectionHeader title="Recovery" meta={`Ready: ${ready.join(', ')}`} />
      <View className="flex-row flex-wrap gap-sm">
        {recovery.map((r) => {
          const isReady = r.percent >= READY;
          return (
            <View
              key={r.muscle}
              className="min-w-[30%] flex-1 gap-xs rounded-md bg-surface-raised p-md"
            >
              <Text variant="caption" tone="muted">
                {r.muscle}
              </Text>
              <Text variant="heading" numeric tone={isReady ? 'success' : 'default'}>
                {r.percent}%
              </Text>
              <ProgressBar
                progress={r.percent / 100}
                tone={isReady ? 'success' : 'warning'}
                height={4}
                accessibilityLabel={`${r.muscle} recovery`}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}
