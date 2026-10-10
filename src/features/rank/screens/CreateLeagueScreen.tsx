import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import {
  Button,
  Card,
  Input,
  OptionCard,
  Screen,
  SegmentedControl,
  SelectField,
  Text,
} from '@/components';
import {
  leagueErrorMessage,
  leagueScorings,
  useCreateCustomLeague,
  type LeagueScoring,
} from '@/lib/leagues';
import { useRankLifts } from '@/lib/ranks';

import { LiftPickerSheet } from '../components/leagues/LiftPickerSheet';
import { SCORING_LABELS } from '../components/leagues/leagueCopy';
import { inviteMessage } from '../components/leagues/invite';

const WEEKS = [
  { value: '1', label: '1 week' },
  { value: '2', label: '2 weeks' },
  { value: '4', label: '4 weeks' },
  { value: '8', label: '8 weeks' },
] as const;

/** Start a league for friends: name, length, how it's scored; then share the invite code. */
export function CreateLeagueScreen() {
  const create = useCreateCustomLeague();
  const lifts = useRankLifts();
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState<(typeof WEEKS)[number]['value']>('4');
  const [scoring, setScoring] = useState<LeagueScoring>('lp');
  const [lift, setLift] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const created = create.data;
  const trimmed = name.trim();
  const valid =
    trimmed.length >= 1 && trimmed.length <= 40 && (scoring !== 'lift_improvement' || !!lift);

  if (created) {
    return (
      <Screen title="League created" onBack={() => router.back()} scroll>
        <Card className="items-center gap-md">
          <Text tone="muted">Share this code with your friends</Text>
          <Text
            variant="display"
            numeric
            accessibilityLabel={`Invite code ${created.inviteCode.split('').join(' ')}`}
          >
            {created.inviteCode}
          </Text>
          <Button
            label="Share invite"
            variant="accent"
            className="self-stretch"
            onPress={() =>
              void Share.share({ message: inviteMessage(trimmed, created.inviteCode) })
            }
          />
          <Button
            label="Open league"
            variant="secondary"
            className="self-stretch"
            onPress={() =>
              router.replace({ pathname: '/leagues/[id]', params: { id: created.id } })
            }
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="New league"
      onBack={() => router.back()}
      scroll
      avoidKeyboard
      footer={
        <Button
          label={create.isPending ? 'Creating…' : 'Create league'}
          disabled={!valid || create.isPending}
          onPress={() =>
            create.mutate({ name: trimmed, weeks: Number(weeks), scoring, rankKey: lift })
          }
        />
      }
    >
      <View className="gap-xl">
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="Hostel H4 lifters"
        />
        <View className="gap-sm">
          <Text variant="label">How long</Text>
          <SegmentedControl
            options={WEEKS}
            value={weeks}
            onChange={setWeeks}
            accessibilityLabel="League length"
          />
        </View>
        <View className="gap-sm">
          <Text variant="label">Scored by</Text>
          {leagueScorings.map((s) => (
            <OptionCard
              key={s}
              wide
              title={SCORING_LABELS[s].title}
              subtitle={SCORING_LABELS[s].description}
              selected={scoring === s}
              onPress={() => setScoring(s)}
            />
          ))}
          {scoring === 'lift_improvement' ? (
            <SelectField
              label="Lift"
              value={lifts.data?.find((l) => l.rankKey === lift)?.name ?? 'Pick a lift'}
              onPress={() => setPicking(true)}
            />
          ) : null}
        </View>
        {create.isError ? <Text tone="danger">{leagueErrorMessage(create.error)}</Text> : null}
      </View>
      <LiftPickerSheet
        visible={picking}
        lifts={lifts.data ?? []}
        selected={lift}
        onSelect={setLift}
        onClose={() => setPicking(false)}
      />
    </Screen>
  );
}
