import { useState } from 'react';
import { View } from 'react-native';

import { Button, ListGroup, ListItem } from '@/components';
import { confirmSignOut, useAuthStore } from '@/lib/auth';

const PROVIDER_LABEL: Record<string, string> = { google: 'Google', email: 'Email code' };

/** Signed-in email and method, and sign out (warns first if changes haven't synced). */
export function AccountSettings() {
  const user = useAuthStore((s) => s.session?.user);
  const [signingOut, setSigningOut] = useState(false);
  const provider = user?.app_metadata.provider ?? 'email';

  return (
    <View className="gap-lg">
      <ListGroup>
        <ListItem title="Email" value={user?.email ?? '—'} />
        <ListItem title="Signed in with" value={PROVIDER_LABEL[provider] ?? provider} />
      </ListGroup>
      <Button
        label="Sign out"
        variant="outline"
        fullWidth
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          void confirmSignOut().finally(() => setSigningOut(false));
        }}
      />
    </View>
  );
}
