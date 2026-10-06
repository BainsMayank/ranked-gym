import { View } from 'react-native';

import { LeaderboardRow } from '@/components';

import { league } from '../mocks';
import { ZoneDivider } from './ZoneDivider';

/** League table with promotion and demotion cut-offs. */
export function StandingsList() {
  return (
    <View className="overflow-hidden rounded-lg border-t border-edge bg-surface py-xs">
      {league.standings.map((s) => (
        <View key={s.position}>
          <LeaderboardRow
            position={s.position}
            name={s.name}
            score={`${s.xp} XP`}
            isYou={s.isYou}
          />
          {s.position === league.promoteTop ? <ZoneDivider kind="promotion" /> : null}
        </View>
      ))}
      <ZoneDivider kind="demotion" />
      {league.demotion.map((s) => (
        <LeaderboardRow key={s.position} position={s.position} name={s.name} score={`${s.xp} XP`} />
      ))}
    </View>
  );
}
