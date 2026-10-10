import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';

import { Button, Card, EmptyState, Screen, Skeleton, Text } from '@/components';
import { useLeagueStandings, useLeaveLeague } from '@/lib/leagues';
import { useRankLifts } from '@/lib/ranks';

import { AddChallengeSheet } from '../components/leagues/AddChallengeSheet';
import { ChallengesCard } from '../components/leagues/ChallengesCard';
import { inviteMessage } from '../components/leagues/invite';
import { LeagueChatCard } from '../components/leagues/LeagueChatCard';
import { SCORING_LABELS } from '../components/leagues/leagueCopy';
import { StandingsList } from '../components/leagues/StandingsList';

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

/** A friend league (or any league I'm in): standings, challenges, invite and leave. */
export function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const standings = useLeagueStandings(id);
  const lifts = useRankLifts();
  const leave = useLeaveLeague();
  const [adding, setAdding] = useState(false);
  const s = standings.data;
  const liftName = lifts.data?.find((l) => l.rankKey === s?.scoringRankKey)?.name;

  const confirmLeave = () =>
    s &&
    Alert.alert(
      s.isOwner ? 'Delete this league?' : 'Leave this league?',
      s.isOwner ? 'It ends for everyone in it.' : 'You can rejoin with the code while it runs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: s.isOwner ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: () => leave.mutate(s.leagueId, { onSuccess: () => router.back() }),
        },
      ],
    );

  return (
    <Screen title={s?.name ?? 'League'} onBack={() => router.back()} scroll>
      {standings.isLoading ? <Skeleton height={320} radius="lg" /> : null}
      {!standings.isLoading && !s ? (
        <EmptyState
          title="League not found"
          description="It may have ended, or you’re not in it."
        />
      ) : null}
      {s ? (
        <View className="gap-lg">
          <Text tone="muted">
            {SCORING_LABELS[s.scoring].title}
            {liftName ? ` on ${liftName}` : ''} · {s.members} member{s.members === 1 ? '' : 's'} ·{' '}
            {s.status === 'closed' ? 'finished' : `ends ${DATE.format(new Date(s.endsAt))}`}
          </Text>
          {s.inviteCode && s.status === 'open' ? (
            <Card className="flex-row items-center gap-md">
              <View className="flex-1">
                <Text variant="caption" tone="muted">
                  Invite code
                </Text>
                <Text variant="heading" numeric>
                  {s.inviteCode}
                </Text>
              </View>
              <Button
                label="Share"
                variant="outline"
                size="sm"
                onPress={() =>
                  void Share.share({ message: inviteMessage(s.name, s.inviteCode ?? '') })
                }
              />
            </Card>
          ) : null}
          <StandingsList standings={s} />
          <ChallengesCard leagueId={s.leagueId} />
          {s.isOwner && s.status === 'open' ? (
            <Button label="Add a challenge" variant="outline" onPress={() => setAdding(true)} />
          ) : null}
          <LeagueChatCard />
          {s.kind === 'custom' ? (
            <Button
              label={s.isOwner ? 'Delete league' : 'Leave league'}
              variant="destructive"
              onPress={confirmLeave}
            />
          ) : null}
          <AddChallengeSheet
            leagueId={s.leagueId}
            lifts={lifts.data ?? []}
            visible={adding}
            onClose={() => setAdding(false)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
