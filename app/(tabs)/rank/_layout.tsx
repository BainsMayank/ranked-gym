import { TopTabsNavigator } from '@/components/navigation/TopTabsNavigator';

const SCREENS = [
  { name: 'index', title: 'My Ranks' },
  { name: 'body-map', title: 'Body Map' },
  { name: 'leagues', title: 'Leagues' },
  { name: 'analysis', title: 'Analysis' },
  { name: 'records', title: 'Records' },
] as const;

export default function RankLayout() {
  return <TopTabsNavigator title="Rank" screens={SCREENS} />;
}
