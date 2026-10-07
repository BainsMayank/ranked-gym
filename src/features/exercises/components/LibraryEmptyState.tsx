import { EmptyState } from '@/components';
import { useExerciseLibrarySync } from '@/lib/exercises';

export interface LibraryEmptyStateProps {
  /** Nothing has been downloaded yet (first launch offline). */
  emptyLibrary: boolean;
  query: string;
  onCreate: () => void;
}

/** Why the list is empty: library not downloaded yet, or nothing matches the search. */
export function LibraryEmptyState({ emptyLibrary, query, onCreate }: LibraryEmptyStateProps) {
  const sync = useExerciseLibrarySync();

  if (emptyLibrary) {
    if (sync.isFetching) {
      return (
        <EmptyState
          icon="cloud-download-outline"
          title="Downloading exercises"
          description="This happens once. After that the library works offline."
          className="pt-xxl"
        />
      );
    }
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Connect once to download the library"
        description="Exercises are saved on your phone after the first download, so search works offline."
        action={{ label: 'Try again', onPress: () => void sync.refetch() }}
        className="pt-xxl"
      />
    );
  }

  return (
    <EmptyState
      icon="search-outline"
      title={query ? `No exercises match “${query}”` : 'No exercises match these filters'}
      description="Try another name, or make your own."
      action={{ label: query ? `Create “${query}”` : 'Create an exercise', onPress: onCreate }}
      className="pt-xxl"
    />
  );
}
