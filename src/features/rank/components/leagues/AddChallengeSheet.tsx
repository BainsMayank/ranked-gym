import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Input, NumberStepper, SelectField, Sheet, Text } from '@/components';
import { leagueErrorMessage, useCreateChallenge, type ChallengeKind } from '@/lib/leagues';
import type { RankLift } from '@/lib/ranks';

import { LiftPickerSheet } from './LiftPickerSheet';

const KINDS: { kind: ChallengeKind; label: string }[] = [
  { kind: 'most_reps', label: 'Most reps' },
  { kind: 'lift_frequency', label: 'Lift sessions' },
  { kind: 'workouts', label: 'Workouts' },
];

function defaultTitle(kind: ChallengeKind, lift: string | undefined, target: number): string {
  if (kind === 'workouts') return `${target} workouts`;
  if (kind === 'most_reps') return `Most ${lift?.toLowerCase() ?? 'reps'} reps`;
  return `${lift ?? 'Train'} ${target} times`;
}

/** The league creator adds a challenge: most reps of a lift, train a lift N times, or N workouts. */
export function AddChallengeSheet({
  leagueId,
  lifts,
  visible,
  onClose,
}: {
  leagueId: string;
  lifts: readonly RankLift[];
  visible: boolean;
  onClose: () => void;
}) {
  const create = useCreateChallenge();
  const [kind, setKind] = useState<ChallengeKind>('most_reps');
  const [lift, setLift] = useState<string | null>('pullUp');
  const [target, setTarget] = useState(4);
  const [title, setTitle] = useState('');
  const [picking, setPicking] = useState(false);
  const liftName = lifts.find((l) => l.rankKey === lift)?.name;
  const finalTitle = title.trim() || defaultTitle(kind, liftName, target);
  const valid = kind === 'workouts' || !!lift;

  return (
    <Sheet visible={visible} onClose={onClose} title="New challenge">
      <View className="gap-lg pb-md">
        <View className="flex-row flex-wrap gap-sm">
          {KINDS.map((k) => (
            <Chip
              key={k.kind}
              label={k.label}
              selected={kind === k.kind}
              onPress={() => setKind(k.kind)}
            />
          ))}
        </View>
        {kind !== 'workouts' ? (
          <SelectField
            label="Lift"
            value={liftName ?? 'Pick a lift'}
            onPress={() => setPicking(true)}
          />
        ) : null}
        {kind !== 'most_reps' ? (
          <NumberStepper
            label="Target"
            value={target}
            onChange={setTarget}
            min={1}
            max={30}
            unit={kind === 'workouts' ? 'workouts' : 'sessions'}
          />
        ) : null}
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          placeholder={finalTitle}
        />
        {create.isError ? <Text tone="danger">{leagueErrorMessage(create.error)}</Text> : null}
        <Button
          label={create.isPending ? 'Adding…' : 'Add challenge'}
          disabled={!valid || create.isPending}
          onPress={() =>
            create.mutate(
              {
                leagueId,
                kind,
                title: finalTitle,
                rankKey: kind === 'workouts' ? null : lift,
                target: kind === 'most_reps' ? null : target,
              },
              { onSuccess: onClose },
            )
          }
        />
      </View>
      <LiftPickerSheet
        visible={picking}
        lifts={lifts}
        selected={lift}
        onSelect={setLift}
        onClose={() => setPicking(false)}
      />
    </Sheet>
  );
}
