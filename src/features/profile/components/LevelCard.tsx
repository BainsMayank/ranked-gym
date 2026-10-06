import { View } from 'react-native';

import { Card, ProgressBar, Tag, Text } from '@/components';

import { me, xpSources } from '../mocks';

/** Level and XP to the next one, plus how XP is earned. */
export function LevelCard() {
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <Card className="gap-md">
      <View className="flex-row items-end justify-between">
        <Text variant="display" numeric>
          Level {me.level}
        </Text>
        <Text variant="label" tone="muted" numeric>
          {fmt(me.xp)} / {fmt(me.xpNext)} XP
        </Text>
      </View>
      <ProgressBar progress={me.xp / me.xpNext} accessibilityLabel={`Level ${me.level} progress`} />
      <View className="flex-row flex-wrap gap-xs">
        {xpSources.map((s) => (
          <Tag key={s} label={s} />
        ))}
      </View>
    </Card>
  );
}
