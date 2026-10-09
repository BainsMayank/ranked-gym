import { View } from 'react-native';

import { Button, NumberStepper, Text } from '@/components';
import { useProfile, useTrainingSettings, useUpdateTrainingSettings } from '@/lib/profile';
import { roundTo, toKg } from '@/lib/units';
import {
  barFor,
  DEFAULT_KG_PLATES,
  DEFAULT_LB_PLATES,
  platesFor,
  platesToStock,
} from '@/lib/workouts';

/** The bar and the plates in your gym, for the plate calculator. In your own unit. */
export function PlatesSettings() {
  const settings = useTrainingSettings();
  const update = useUpdateTrainingSettings();
  const { data: profile } = useProfile();
  const unit = profile?.units ?? 'kg';
  const pending = update.isError ? undefined : update.variables;
  const stock = pending?.plate_inventory ?? settings.plate_inventory;
  const plates = platesFor(stock, unit);
  const bar = barFor(pending?.bar_weight_kg ?? settings.bar_weight_kg, unit);

  const setPairs = (weight: number, pairs: number) =>
    update.mutate({
      plate_inventory: platesToStock(
        plates.map((p) => (p.weight === weight ? { ...p, pairs } : p)),
        unit,
      ),
    });

  return (
    <View className="gap-md">
      <Text variant="label" tone="muted">
        Bar and plates
      </Text>
      <NumberStepper
        label="Bar weight"
        value={bar}
        onChange={(v) => update.mutate({ bar_weight_kg: roundTo(toKg(v, unit), 0.1) })}
        min={0}
        max={unit === 'kg' ? 50 : 110}
        step={unit === 'kg' ? 2.5 : 5}
        unit={unit}
      />
      {plates.map((p) => (
        <View key={p.weight} className="flex-row items-center gap-md">
          <Text variant="subheading" numeric className="w-20">
            {p.weight} {unit}
          </Text>
          <NumberStepper
            label={`Pairs of ${p.weight} ${unit} plates`}
            value={p.pairs}
            onChange={(n) => setPairs(p.weight, n)}
            min={0}
            max={10}
            format={(n) => `${n} ${n === 1 ? 'pair' : 'pairs'}`}
            className="flex-1"
          />
        </View>
      ))}
      <Button
        label="Reset to standard plates"
        variant="ghost"
        size="sm"
        onPress={() =>
          update.mutate({
            plate_inventory: platesToStock(
              unit === 'kg' ? DEFAULT_KG_PLATES : DEFAULT_LB_PLATES,
              unit,
            ),
          })
        }
      />
    </View>
  );
}
