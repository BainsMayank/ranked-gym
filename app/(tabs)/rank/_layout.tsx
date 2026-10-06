import { TopTabsNavigator } from '@/components/navigation/TopTabsNavigator';
import { SeasonTag } from '@/features/rank/components/SeasonTag';

const SCREENS = [
  { name: 'index', title: 'Ranks' },
  { name: 'body-map', title: 'Body' },
  { name: 'leagues', title: 'Leagues' },
  { name: 'analysis', title: 'Analysis' },
  { name: 'records', title: 'Records' },
] as const;

export default function RankLayout() {
  return <TopTabsNavigator title="Rank" screens={SCREENS} headerRight={<SeasonTag />} />;
}
