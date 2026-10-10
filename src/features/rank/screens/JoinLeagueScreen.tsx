import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { leagueErrorMessage, useJoinLeague } from '@/lib/leagues';
import { useServerReads } from '@/lib/ranks';

import { SignedOutRanks } from '../components/SignedOutRanks';

/** Join a friend's league with its 8-character code (also opened by invite links). */
export function JoinLeagueScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const signedIn = useServerReads();
  const join = useJoinLeague();
  const [code, setCode] = useState((params.code ?? '').toUpperCase().slice(0, 8));
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  return (
    <Screen
      title="Join a league"
      onBack={() => router.back()}
      scroll
      avoidKeyboard
      footer={
        signedIn ? (
          <Button
            label={join.isPending ? 'Joining…' : 'Join league'}
            disabled={clean.length !== 8 || join.isPending}
            onPress={() =>
              join.mutate(clean, {
                onSuccess: (id) => router.replace({ pathname: '/leagues/[id]', params: { id } }),
              })
            }
          />
        ) : undefined
      }
    >
      {signedIn ? (
        <View className="gap-lg">
          <Input
            label="Invite code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            placeholder="H4LIFTRS"
            helperText="8 letters and numbers, from whoever started the league."
          />
          {join.isError ? <Text tone="danger">{leagueErrorMessage(join.error)}</Text> : null}
        </View>
      ) : (
        <SignedOutRanks what="leagues" />
      )}
    </Screen>
  );
}
