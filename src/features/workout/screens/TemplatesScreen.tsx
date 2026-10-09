import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';

import { ListGroup, Screen, showToast, Text } from '@/components';
import { muscleShortLabels, useExercises } from '@/lib/exercises';
import {
  instantiateTemplate,
  muscleSets,
  routineTemplates,
  useSaveRoutine,
  type RoutineTemplate,
} from '@/lib/routines';

import { TemplateRow } from '../components/TemplateRow';

/** Starter routines bundled with the app. One tap copies one into your routines. */
export function TemplatesScreen() {
  const router = useRouter();
  const { data: library } = useExercises();
  const save = useSaveRoutine();
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  const previews = useMemo(() => {
    if (!library?.length) return null;
    const byId = new Map(library.map((e) => [e.id, e]));
    return routineTemplates.map((t) => {
      const doc = instantiateTemplate(t, library, randomUUID, new Date().toISOString());
      const muscles = doc
        ? muscleSets(
            doc.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              workingSets: e.sets.filter((s) => s.setType !== 'warmup').length,
            })),
            (id) => byId.get(id),
          )
            .slice(0, 3)
            .map((m) => muscleShortLabels[m.muscle])
        : [];
      return { template: t, doc, muscles };
    });
  }, [library]);

  const add = async (template: RoutineTemplate) => {
    if (!library) return;
    // Fresh ids each time, so the same starter can be added twice.
    const doc = instantiateTemplate(template, library, randomUUID, new Date().toISOString());
    if (!doc) return;
    await save.mutateAsync(doc);
    setAdded((prev) => new Set(prev).add(template.slug));
    showToast({
      message: `${template.name} added to your routines`,
      actionLabel: 'Edit',
      onAction: () => router.push({ pathname: '/routine/[id]', params: { id: doc.id } }),
      above: 'none',
    });
  };

  return (
    <Screen
      title="Starter routines"
      subtitle="Add one, then make it yours"
      onBack={() => router.back()}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerClassName="pb-xxl">
        {!previews ? (
          <Text variant="body" tone="muted">
            The exercise library is still downloading. Connect to the internet once to finish.
          </Text>
        ) : (
          <ListGroup>
            {previews.map(({ template, doc, muscles }) => (
              <TemplateRow
                key={template.slug}
                name={template.name}
                description={template.description}
                meta={
                  doc
                    ? [
                        `${doc.exercises.length} exercises`,
                        `~${doc.estimatedDurationMin} min`,
                        muscles.join(', '),
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : null
                }
                colour={template.colour}
                added={added.has(template.slug)}
                onAdd={() => void add(template)}
              />
            ))}
          </ListGroup>
        )}
      </ScrollView>
    </Screen>
  );
}
