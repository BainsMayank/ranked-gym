import { View } from 'react-native';

import { Button, LeagueBadge, Sheet, ShareToFeedButton, Text } from '@/components';
import type { LeagueResult } from '@/lib/leagues';

import { outcomeHeadline } from './leagueCopy';

/** Monday's result for a finished week: shown once, then marked seen. */
export function LeagueResultSheet({
  result,
  onDone,
}: {
  result: LeagueResult | null;
  onDone: () => void;
}) {
  if (!result) return null;
  const division =
    result.outcome === 'stayed' ? result.division : (result.newDivision ?? result.division);
  return (
    <Sheet
      visible
      onClose={onDone}
      title={`Season ${result.seasonNumber} · week ${result.weekNo} results`}
    >
      <View className="items-center gap-md pb-md">
        <LeagueBadge division={division} size={112} />
        <Text variant="title" className="text-center">
          {outcomeHeadline(result.outcome, result.division, result.newDivision)}
        </Text>
        <Text tone="muted" numeric className="text-center">
          You finished #{result.position ?? '—'} of {result.members} with {result.points ?? 0} LP.
        </Text>
        <Button label="On to this week" onPress={onDone} className="self-stretch" />
        <ShareToFeedButton
          milestone={{ kind: 'league_result', leagueId: result.leagueId }}
          label="Share result"
          variant="ghost"
          className="self-stretch"
        />
      </View>
    </Sheet>
  );
}
