import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuthStore } from '@/lib/auth/authStore';
import { Button, Chip, Input, Screen, Text } from '@/components';
import {
  bodyweightRate,
  goalLabels,
  goalTypes,
  useSaveGoal,
  validDate,
  type Goal,
  type GoalTarget,
  type GoalType,
} from '@/lib/insights';
import { useLatestBodyweight } from '@/lib/profile';
import { useMilestoneMode } from '@/lib/social';
import { errorMessage } from '@/lib/sync/types';
import { LiftGoalFields } from './LiftGoalFields';
import { RankGoalFields } from './RankGoalFields';
import { OtherGoalFields } from './OtherGoalFields';
import { goalTargetInput } from '@/lib/insights/goalInput';

export function GoalForm({ initial }: { initial?: Goal }) {
  const router = useRouter();
  const preview = useAuthStore((s) => s.preview && !s.session);
  const save = useSaveGoal();
  const { data: bw } = useLatestBodyweight();
  const [id] = useState(() => initial?.id ?? randomUUID());
  const [type, setType] = useState<GoalType>(initial?.type ?? 'lift');
  const [title, setTitle] = useState(initial?.target.title ?? '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [target, setTarget] = useState<GoalTarget>(
    initial?.target ?? {
      title: '',
      reps: 5,
      score: 400,
      scope: 'overall',
      key: 'overall',
      checked: false,
    },
  );
  const [number, setNumber] = useState(
    String(initial?.target.weight_kg ?? initial?.target.kg ?? initial?.target.value ?? ''),
  );
  const [reps, setReps] = useState(String(initial?.target.reps ?? 5));
  const [autoPost, setAutoPost] = useState(initial?.auto_post ?? false);
  const sharingOff = useMilestoneMode().data === 'never';
  const [error, setError] = useState('');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/insights/goals'));
  function submit() {
    const result = goalTargetInput({
      type,
      title,
      target,
      number,
      reps,
      deadline,
      hasBodyweight: !!bw,
    });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError('');
    save.mutate(
      { id, type, target: result.target, deadline: deadline || null, autoPost },
      { onSuccess: back },
    );
  }
  const rate =
    type === 'bodyweight' && bw && validDate(deadline)
      ? bodyweightRate(Number(bw.weight_kg), Number(number), deadline)
      : null;
  return (
    <Screen
      title={initial ? 'Edit goal' : 'Create goal'}
      onBack={back}
      scroll
      avoidKeyboard
      edges={['top', 'bottom']}
      className="gap-lg"
      footer={<Button label="Save goal" loading={save.isPending} onPress={submit} />}
    >
      <Text variant="subheading">Goal type</Text>
      <View className="flex-row flex-wrap gap-sm">
        {goalTypes.map((t) => (
          <Chip
            key={t}
            label={goalLabels[t]}
            selected={type === t}
            disabled={!!initial && type !== t}
            onPress={() => {
              setType(t);
              setNumber('');
            }}
          />
        ))}
      </View>
      <Input
        label="Goal name"
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        keyboardType="default"
        autoComplete="off"
      />
      {type === 'lift' ? (
        <LiftGoalFields
          target={target}
          setTarget={setTarget}
          number={number}
          setNumber={setNumber}
          reps={reps}
          setReps={setReps}
          setTitle={setTitle}
          editing={!!initial}
        />
      ) : null}
      {type === 'rank' ? <RankGoalFields target={target} setTarget={setTarget} /> : null}
      <OtherGoalFields
        type={type}
        number={number}
        setNumber={setNumber}
        title={title}
        setTitle={setTitle}
        hasBodyweight={!!bw}
      />
      <Input
        label="Deadline (optional, YYYY-MM-DD)"
        value={deadline}
        onChangeText={setDeadline}
        keyboardType="numbers-and-punctuation"
      />
      {rate !== null && rate > 0.01 ? (
        <Text tone="warning">
          That works out to more than about 1% of your bodyweight each week. A little more time may
          make this easier to sustain.
        </Text>
      ) : null}
      {sharingOff ? null : (
        <Chip
          label={autoPost ? 'Share to feed when achieved: on' : 'Share to feed when achieved: off'}
          selected={autoPost}
          disabled={preview}
          onPress={() => setAutoPost(!autoPost)}
        />
      )}
      <Text variant="caption" tone="muted">
        {sharingOff
          ? 'Milestone sharing is off (Settings, Privacy), so goals stay off the feed.'
          : preview
            ? 'Device preview goals stay on this phone. Rank completion and feed sharing require an account.'
            : 'Optional. Uses your profile visibility. Bodyweight and other goals stay private unless you turn sharing on.'}
      </Text>
      {error || save.isError ? (
        <Text tone="danger">{error || errorMessage(save.error)}</Text>
      ) : null}
    </Screen>
  );
}
