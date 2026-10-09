import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, NumberStepper, Sheet, Text } from '@/components';
import { fromKg } from '@/lib/units';
import { loadPlates } from '@/lib/workouts';

import { useSessionEnv } from '../SessionEnv';
import { useSession, useSessionStore } from '../store';
import { PlateDiagram } from './PlateDiagram';

/** Plate calculator: what goes on each side of the bar for a target, from the plates you own. */
export function PlatesSheet() {
  const store = useSessionStore();
  const router = useRouter();
  const env = useSessionEnv();
  const sheet = useSession((s) => s.sheet);
  const visible = sheet?.kind === 'plates';
  const initial =
    visible && sheet.targetKg !== null ? fromKg(sheet.targetKg, env.unit, 0.25) : null;
  const [target, setTarget] = useState<number | null>(null);
  const [seen, setSeen] = useState<number | null>(null);
  // Follow the cell that opened the sheet (each opening starts from its weight).
  if (visible && initial !== seen) {
    setSeen(initial);
    setTarget(initial ?? env.bar);
  }

  const value = target ?? env.bar;
  const load = loadPlates(value, env.bar, env.plates);
  const heaviest = env.plates[0]?.weight ?? 25;
  const close = () => store.getState().openSheet(null);
  const summary = load.belowBar
    ? `Lighter than the ${env.bar} ${env.unit} bar`
    : load.perSide.length === 0
      ? 'Just the bar'
      : `Each side: ${load.perSide.join(' + ')}`;

  return (
    <Sheet visible={visible} onClose={close} title="Plate calculator">
      <View className="gap-lg pb-sm">
        <NumberStepper
          label="Target weight"
          value={value}
          onChange={setTarget}
          min={0}
          max={env.unit === 'kg' ? 500 : 1100}
          step={env.unit === 'kg' ? 2.5 : 5}
          unit={env.unit}
        />
        <PlateDiagram plates={load.perSide} heaviest={heaviest} />
        <View className="gap-xxs">
          <Text variant="subheading" numeric>
            {summary}
          </Text>
          <Text variant="caption" tone="muted" numeric>
            {load.shortBy > 0
              ? `Closest you can load is ${load.total} ${env.unit} (${load.shortBy} ${env.unit} short)`
              : `${env.bar} ${env.unit} bar · ${load.total} ${env.unit} total`}
          </Text>
        </View>
        <Button
          label="Edit bar and plates"
          variant="ghost"
          size="sm"
          onPress={() => {
            close();
            router.push({
              pathname: '/profile/settings/[section]',
              params: { section: 'training' },
            });
          }}
        />
      </View>
    </Sheet>
  );
}
