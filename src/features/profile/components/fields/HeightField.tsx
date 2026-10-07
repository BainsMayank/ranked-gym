import { View } from 'react-native';

import { Input } from '@/components';
import type { WeightUnit } from '@/lib/units';

export interface HeightValues {
  heightCm: string;
  feet: string;
  inches: string;
}

interface HeightFieldProps {
  unit: WeightUnit;
  values: HeightValues;
  onChange: (key: keyof HeightValues, value: string) => void;
  onBlur: (key: keyof HeightValues) => void;
  errors: Partial<Record<keyof HeightValues, string>>;
}

/** Height in cm for kg users, feet + inches for lb users. */
export function HeightField({ unit, values, onChange, onBlur, errors }: HeightFieldProps) {
  if (unit === 'kg') {
    return (
      <Input
        label="Height (cm)"
        placeholder="172"
        keyboardType="decimal-pad"
        maxLength={5}
        value={values.heightCm}
        onChangeText={(t) => onChange('heightCm', t)}
        onBlur={() => onBlur('heightCm')}
        error={errors.heightCm}
      />
    );
  }
  return (
    <View className="flex-row gap-sm">
      <Input
        label="Height (ft)"
        placeholder="5"
        keyboardType="number-pad"
        maxLength={1}
        value={values.feet}
        onChangeText={(t) => onChange('feet', t)}
        onBlur={() => onBlur('feet')}
        error={errors.feet}
        className="flex-1"
      />
      <Input
        label="Inches"
        placeholder="8"
        keyboardType="number-pad"
        maxLength={2}
        value={values.inches}
        onChangeText={(t) => onChange('inches', t)}
        onBlur={() => onBlur('inches')}
        error={errors.inches}
        className="flex-1"
      />
    </View>
  );
}
