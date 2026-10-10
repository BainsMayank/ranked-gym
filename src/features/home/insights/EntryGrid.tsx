import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components';
import { muscleLabels } from '@/lib/exercises/taxonomy';
import { goalProgress, type Analytics, type Goal } from '@/lib/insights';

export function EntryGrid({
  data,
  goals,
  recovery,
  weekVolume,
}: {
  data: Analytics;
  goals: readonly Goal[];
  recovery: number;
  weekVolume: number;
}) {
  const router = useRouter();
  const top = data.muscles[0];
  const nearest = [...goals]
    .filter((g) => g.status === 'active')
    .sort((a, b) => goalProgress(b) - goalProgress(a))[0];
  const cards = [
    {
      title: 'Muscle Analysis',
      preview: top ? muscleLabels[top.muscle] : 'No working sets yet',
      detail: top ? `${top.sets.toFixed(1)} weighted sets · 14 days` : 'Log a session to start',
      route: '/insights/muscles' as const,
      progress: null,
    },
    {
      title: 'Recovery',
      preview: `${Math.round(recovery)}% recovered`,
      detail: 'Estimated across muscles',
      route: '/insights/recovery' as const,
      progress: recovery / 100,
    },
    {
      title: 'Goals',
      preview: nearest?.target.title ?? 'Set your next milestone',
      detail: nearest
        ? `${Math.round(goalProgress(nearest) * 100)}% of nearest goal`
        : 'Choose what matters to you',
      route: '/insights/goals' as const,
      progress: nearest ? goalProgress(nearest) : null,
    },
    {
      title: 'Overview',
      preview: `${(weekVolume / 1000).toFixed(1)} t this week`,
      detail: 'Volume, time and trends',
      route: '/insights/overview' as const,
      progress: null,
    },
  ];
  return (
    <View className="gap-md">
      {[cards.slice(0, 2), cards.slice(2, 4)].map((row, i) => (
        <View key={i} className="flex-row gap-md">
          {row.map((c) => (
            <View className="flex-1" key={c.title}>
              <Card
                onPress={() => router.push(c.route)}
                accessibilityLabel={`${c.title}. ${c.preview}. ${c.detail}`}
                className="flex-1 gap-sm"
              >
                <Text variant="label">{c.title}</Text>
                <Text variant="heading" numberOfLines={2} numeric>
                  {c.preview}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {c.detail}
                </Text>
                {c.progress !== null ? (
                  <ProgressBar progress={c.progress} tone="neutral" accessibilityLabel={c.title} />
                ) : null}
              </Card>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
