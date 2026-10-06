import { View } from 'react-native';

import { ListGroup, ListItem, Screen, SectionHeader, Stat, Tag } from '@/components';

import { records } from '../mocks';

/** Rank → Records: personal bests per lift (no mockup; follows the same list language). */
export function RecordsScreen() {
  const fresh = records.filter((r) => r.isNew).length;
  return (
    <Screen edges={[]} scroll className="pt-sm">
      <View className="gap-lg">
        <View className="flex-row gap-sm">
          <Stat label="Lifts with PRs" value={`${records.length}`} boxed className="flex-1" />
          <Stat
            label="New this week"
            value={`${fresh}`}
            valueTone="warning"
            boxed
            className="flex-1"
          />
          <Stat label="Best e1RM" value="168 kg" boxed className="flex-1" />
        </View>
        <SectionHeader title="Personal records" meta="Best set · e1RM" />
        <ListGroup>
          {records.map((r) => (
            <ListItem
              key={r.lift}
              title={r.lift}
              subtitle={`${r.best} · e1RM ${r.e1rm} · ${r.date}`}
              titleAccessory={r.isNew ? <Tag label="New PR" tone="warning" /> : undefined}
              onPress={() => undefined}
            />
          ))}
        </ListGroup>
      </View>
    </Screen>
  );
}
