import { View } from 'react-native';

import { Text } from '@/components';

import { setTypes } from '../mocks';
import { setTypeInfo } from './SetTypeBadge';

export function SetTypeLegend() {
  return (
    <View className="gap-sm rounded-lg bg-surface p-lg">
      <Text variant="overline" tone="muted">
        Set types · tap a set number to change
      </Text>
      <View className="flex-row flex-wrap gap-y-sm">
        {setTypes.map((t) => (
          <View key={t} className="w-1/2 flex-row items-center gap-sm">
            <View className="h-6 w-6 items-center justify-center rounded-sm bg-surface-raised">
              <Text variant="caption" tone={setTypeInfo[t].tone}>
                {setTypeInfo[t].mark}
              </Text>
            </View>
            <Text variant="caption">{setTypeInfo[t].name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
