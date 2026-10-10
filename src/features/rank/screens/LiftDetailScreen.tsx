import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  DivisionLadder,
  EmptyState,
  RankBadge,
  RankTag,
  Screen,
  Skeleton,
  Text,
} from '@/components';
import { ladderPosition, pointsToNext, useLiftDetail, useLiftPercentile } from '@/lib/ranks';

import { LiftHistoryCard } from '../components/liftDetail/LiftHistoryCard';
import { LiftSetsCard } from '../components/liftDetail/LiftSetsCard';
import { LiftStandardsCard } from '../components/liftDetail/LiftStandardsCard';
import { LiftTargetsCard } from '../components/liftDetail/LiftTargetsCard';
import { SignedOutRanks } from '../components/SignedOutRanks';
import { formatScore, liftName } from '../format';
import { useRankOverview } from '../hooks/useRankOverview';

/** One lift: rank, history, the sets that counted, the next target and its standards. */
export function LiftDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const overview = useRankOverview();
  const detail = useLiftDetail(key);
  const percentile = useLiftPercentile(detail.data?.rank ? key : undefined);
  const name = detail.data?.name ?? liftName(key ?? '', overview.lifts);
  const rank = detail.data?.rank;
  const position = rank && overview.ladder ? ladderPosition(rank.score, overview.ladder) : null;
  const toNext = rank && overview.ladder ? pointsToNext(rank.score, overview.ladder) : null;

  return (
    <Screen title={name} onBack={() => router.back()} scroll>
      {!overview.signedIn ? <SignedOutRanks /> : null}
      {detail.isLoading ? (
        <View className="gap-lg">
          <Skeleton height={180} radius="lg" />
          <Skeleton height={220} radius="lg" />
        </View>
      ) : null}
      {detail.isError ? (
        <EmptyState
          title="This lift could not load"
          action={{ label: 'Try again', onPress: () => void detail.refetch() }}
        />
      ) : null}
      {detail.data ? (
        <View className="gap-lg">
          <View className="items-center gap-sm rounded-lg border-t border-edge bg-surface p-lg">
            {rank ? (
              <>
                <RankBadge tier={rank.rank.tier} division={rank.rank.division} size={72} />
                <RankTag tier={rank.rank.tier} division={rank.rank.division} size="md" />
                <Text tone="muted" numeric>
                  Rank Score {formatScore(rank.score)}
                  {toNext !== null ? ` · ${toNext} pts to the next division` : ''}
                </Text>
                {rank.rank.division && position ? (
                  <DivisionLadder
                    tier={rank.rank.tier}
                    division={rank.rank.division}
                    progress={position.progress}
                    tierColored
                    className="self-stretch"
                  />
                ) : null}
              </>
            ) : (
              <Text tone="muted" className="text-center">
                Not ranked yet. Log a working set of {name.toLowerCase()} to get your first rank.
              </Text>
            )}
          </View>
          <LiftTargetsCard
            prediction={overview.predictionByKey.get(key ?? '')}
            percentile={percentile.data}
            unit={overview.unit}
          />
          <LiftHistoryCard detail={detail.data} unit={overview.unit} />
          <LiftSetsCard sets={detail.data.sets} unit={overview.unit} />
          <LiftStandardsCard standards={detail.data.standards} unit={overview.unit} />
        </View>
      ) : null}
    </Screen>
  );
}
