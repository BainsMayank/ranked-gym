import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Chip, Input } from '@/components';
import type { GoalType } from '@/lib/insights';
export function OtherGoalFields({
  type,
  number,
  setNumber,
  title,
  setTitle,
  hasBodyweight,
}: {
  type: GoalType;
  number: string;
  setNumber: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  hasBodyweight: boolean;
}) {
  const router = useRouter();
  return (
    <>
      {type !== 'lift' && type !== 'rank' && type !== 'custom' ? (
        <Input
          label={
            type === 'bodyweight'
              ? 'Target bodyweight (kg)'
              : type === 'monthly_volume'
                ? 'Volume this calendar month (kg)'
                : type === 'weekly_workouts'
                  ? 'Sessions in one Monday to Sunday week'
                  : 'Consecutive workout days'
          }
          value={number}
          onChangeText={setNumber}
          keyboardType={type === 'bodyweight' ? 'decimal-pad' : 'number-pad'}
        />
      ) : null}
      {type === 'bodyweight' && !hasBodyweight ? (
        <Button
          label="Log current bodyweight"
          variant="outline"
          onPress={() => router.push('/insights/overview')}
        />
      ) : null}
      {type === 'weekly_workouts' || type === 'streak' ? (
        <View className="flex-row flex-wrap gap-sm">
          {(type === 'weekly_workouts' ? [2, 3, 4] : [3, 7, 14]).map((n) => (
            <Chip
              key={n}
              label={String(n)}
              onPress={() => {
                setNumber(String(n));
                if (!title)
                  setTitle(
                    type === 'streak'
                      ? `${n} training days in a row`
                      : `Train ${n} times in a week`,
                  );
              }}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}
