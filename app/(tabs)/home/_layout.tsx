import { TopTabsNavigator } from '@/components/navigation/TopTabsNavigator';
import { NotificationBell } from '@/features/social';

const SCREENS = [
  { name: 'index', title: 'For You' },
  { name: 'feed', title: 'Feed' },
  { name: 'discover', title: 'Discover' },
] as const;

export default function HomeLayout() {
  return <TopTabsNavigator title="Home" screens={SCREENS} headerRight={<NotificationBell />} />;
}
