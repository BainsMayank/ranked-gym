import { TopTabsNavigator } from '@/components/navigation/TopTabsNavigator';

const SCREENS = [
  { name: 'index', title: 'Friends' },
  { name: 'leaderboards', title: 'Leaderboards' },
  { name: 'invite', title: 'Invite' },
] as const;

export default function FriendsLayout() {
  return <TopTabsNavigator title="Friends" screens={SCREENS} />;
}
