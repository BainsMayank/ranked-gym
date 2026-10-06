import { View } from 'react-native';

import {
  Avatar,
  Button,
  IconButton,
  ListGroup,
  ListItem,
  RankTag,
  Screen,
  SectionHeader,
} from '@/components';

import { AddFriendOptions } from '../components/AddFriendOptions';
import { InviteCard } from '../components/InviteCard';
import { StandingsSummary } from '../components/StandingsSummary';
import { friends, requests, summary } from '../mocks';

/** Friends hub: invite, add friends, standings, requests and your friends' activity. */
export function FriendsScreen() {
  return (
    <Screen
      title="Friends"
      subtitle={`${summary.friends} friends · ${summary.activeNow} active now`}
      scroll
    >
      <View className="gap-lg">
        <InviteCard />
        <AddFriendOptions />
        <StandingsSummary />

        <SectionHeader title="Requests" count={requests.length} />
        <ListGroup>
          {requests.map((r) => (
            <ListItem
              key={r.name}
              title={r.name}
              subtitle={r.meta}
              titleAccessory={<RankTag tier={r.rank.tier} division={r.rank.division} />}
              leading={<Avatar name={r.name} size="md" />}
              trailing={
                <View className="flex-row items-center gap-xs">
                  <Button label="Accept" variant="secondary" size="sm" onPress={() => undefined} />
                  <IconButton
                    icon="close"
                    accessibilityLabel={`Decline ${r.name}`}
                    size="sm"
                    variant="surface"
                  />
                </View>
              }
            />
          ))}
        </ListGroup>

        <SectionHeader title="Your friends" />
        <ListGroup>
          {friends.map((f) => (
            <ListItem
              key={f.name}
              title={f.name}
              titleAccessory={<RankTag tier={f.rank.tier} division={f.rank.division} />}
              subtitle={f.status}
              leading={
                <Avatar
                  name={f.name}
                  size="md"
                  ring={f.training ? { tier: f.rank.tier } : undefined}
                />
              }
              trailing={
                <Button label={f.action} variant="outline" size="sm" onPress={() => undefined} />
              }
            />
          ))}
        </ListGroup>
      </View>
    </Screen>
  );
}
