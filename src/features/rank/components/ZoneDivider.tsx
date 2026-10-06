import { View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

/** Line marking a promotion or demotion cut-off inside standings. */
export function ZoneDivider({ kind }: { kind: 'promotion' | 'demotion' }) {
  const { colors } = useTheme();
  const color = kind === 'promotion' ? colors.success : colors.danger;
  return (
    <View accessible accessibilityRole="text" className="flex-row items-center gap-sm px-lg py-xs">
      <View className="h-px flex-1" style={{ backgroundColor: color, opacity: 0.5 }} />
      <Text variant="overline" style={{ color }}>
        {kind === 'promotion' ? 'Promotion zone above' : 'Demotion zone'}
      </Text>
      <View className="h-px flex-1" style={{ backgroundColor: color, opacity: 0.5 }} />
    </View>
  );
}
