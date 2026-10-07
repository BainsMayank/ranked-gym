import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { SectionList, View } from 'react-native';

import { SearchField, Text } from '@/components';
import type { Exercise } from '@/lib/exercises';

import { useExerciseBrowser, type ExerciseSection } from '../hooks/useExerciseBrowser';
import { ExerciseFilterBar } from './ExerciseFilterBar';
import { ExerciseRow } from './ExerciseRow';
import { LibraryEmptyState } from './LibraryEmptyState';

export interface ExerciseBrowserProps {
  /** Multi-select shows check circles; otherwise a tap calls `onPick` straight away. */
  multiple?: boolean;
  selectedIds?: ReadonlySet<string>;
  /** Already in the routine or session. */
  addedIds?: ReadonlySet<string>;
  onPick: (exercise: Exercise) => void;
  /** Shows an info button on each row (the picker); the library opens detail on tap instead. */
  onInfo?: (exercise: Exercise) => void;
  autoFocus?: boolean;
}

/** Search, filters and the sectioned exercise list shared by the library and the picker. */
export function ExerciseBrowser({
  multiple = false,
  selectedIds,
  addedIds,
  onPick,
  onInfo,
  autoFocus = false,
}: ExerciseBrowserProps) {
  const router = useRouter();
  const browser = useExerciseBrowser();
  const listRef = useRef<SectionList<Exercise, ExerciseSection>>(null);

  // New search or filters: start from the best match.
  const hasResults = browser.sections.length > 0;
  useEffect(() => {
    if (!hasResults) return;
    listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: false });
  }, [browser.resultsKey, hasResults]);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow
        exercise={item}
        selectable={multiple}
        selected={selectedIds?.has(item.id) ?? false}
        added={addedIds?.has(item.id) ?? false}
        onPress={onPick}
        onInfo={onInfo}
      />
    ),
    [multiple, selectedIds, addedIds, onPick, onInfo],
  );

  const createCustom = () =>
    router.push({ pathname: '/exercises/new', params: { name: browser.query.trim() } });

  return (
    <View className="flex-1 gap-md">
      <SearchField
        value={browser.query}
        onChangeText={browser.setQuery}
        placeholder="Search exercises"
        autoFocus={autoFocus}
      />
      <ExerciseFilterBar filters={browser.filters} onChange={browser.setFilters} />
      <SectionList
        ref={listRef}
        sections={browser.sections}
        onScrollToIndexFailed={() => undefined}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text variant="overline" tone="muted" className="bg-background pb-xs pt-md">
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          browser.isLoading ? null : (
            <LibraryEmptyState
              emptyLibrary={browser.isEmptyLibrary}
              query={browser.query.trim()}
              onCreate={createCustom}
            />
          )
        }
        ListFooterComponent={
          browser.sections.length > 0 ? <CreateFooter onCreate={createCustom} /> : null
        }
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        className="-mx-lg"
        contentContainerClassName="px-lg pb-xl"
      />
    </View>
  );
}

function Separator() {
  return <View className="h-px bg-border" />;
}

function CreateFooter({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="items-center gap-xs pt-xl">
      <Text variant="caption" tone="muted">
        Can’t find it?
      </Text>
      <Text
        variant="label"
        tone="primary"
        accessibilityRole="button"
        onPress={onCreate}
        suppressHighlighting
      >
        Create a custom exercise
      </Text>
    </View>
  );
}
