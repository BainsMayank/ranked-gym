import { useQuery } from '@tanstack/react-query';
import { Image } from 'react-native';

import { photoUrl } from '@/lib/workouts';

/** The workout's photo: the local file if this phone took it, else a short-lived link. */
export function WorkoutPhoto({ uri, path }: { uri: string | null; path: string | null }) {
  const { data: remote } = useQuery({
    queryKey: ['workouts', 'photo', path],
    queryFn: () => (path ? photoUrl(path) : null),
    enabled: !uri && !!path,
    staleTime: 30 * 60 * 1000,
  });
  const source = uri ?? remote;
  if (!source) return null;
  return (
    <Image
      source={{ uri: source }}
      accessibilityLabel="Workout photo"
      className="aspect-[4/5] w-full rounded-lg bg-surface-raised"
    />
  );
}
