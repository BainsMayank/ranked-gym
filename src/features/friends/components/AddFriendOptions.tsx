import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, Icon, Text, showToast, type IconName } from '@/components';

const later = () => showToast({ message: 'QR codes and contacts arrive with invites soon.' });

/** Username search lives in Home → Discover; QR and contacts come with invites (Phase 10). */
const OPTIONS: { icon: IconName; label: string; onPress: () => void }[] = [
  { icon: 'search', label: 'Username', onPress: () => router.navigate('/home/discover') },
  { icon: 'qr-code-outline', label: 'QR code', onPress: later },
  { icon: 'phone-portrait-outline', label: 'Contacts', onPress: later },
];

export function AddFriendOptions() {
  return (
    <View className="flex-row gap-sm">
      {OPTIONS.map((o) => (
        // flex-1 on a pressable Card collapses its height (the scale wrapper is a column).
        <View key={o.label} className="flex-1">
          <Card
            onPress={o.onPress}
            accessibilityLabel={`Add friends by ${o.label.toLowerCase()}`}
            className="items-center gap-xs py-md"
          >
            <Icon name={o.icon} size={22} />
            <Text variant="label">{o.label}</Text>
          </Card>
        </View>
      ))}
    </View>
  );
}
