import { View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components';

const OPTIONS: { icon: IconName; label: string }[] = [
  { icon: 'search', label: 'Username' },
  { icon: 'qr-code-outline', label: 'QR code' },
  { icon: 'phone-portrait-outline', label: 'Contacts' },
];

export function AddFriendOptions() {
  return (
    <View className="flex-row gap-sm">
      {OPTIONS.map((o) => (
        <Card
          key={o.label}
          onPress={() => undefined}
          accessibilityLabel={`Add friends by ${o.label.toLowerCase()}`}
          className="flex-1 items-center gap-xs py-md"
        >
          <Icon name={o.icon} size={22} />
          <Text variant="label">{o.label}</Text>
        </Card>
      ))}
    </View>
  );
}
