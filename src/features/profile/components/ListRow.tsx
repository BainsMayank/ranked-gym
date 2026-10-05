import { View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components';

export interface ListRowProps {
  title: string;
  icon: IconName;
  onPress: () => void;
  subtitle?: string;
}

export function ListRow({ title, icon, onPress, subtitle }: ListRowProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      className="py-md"
    >
      <View className="flex-row items-center gap-md">
        <Icon name={icon} tone="textMuted" />
        <View className="flex-1">
          <Text variant="subheading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} tone="textMuted" />
      </View>
    </Card>
  );
}
