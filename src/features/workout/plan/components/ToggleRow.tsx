import { Switch, View } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

interface ToggleRowProps {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A labelled switch on a surface (questionnaire options). */
export function ToggleRow({ title, subtitle, value, onChange }: ToggleRowProps) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-md rounded-lg bg-surface p-lg">
      <View className="flex-1 gap-xxs">
        <Text variant="subheading">{title}</Text>
        <Text variant="caption" tone="muted">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}
