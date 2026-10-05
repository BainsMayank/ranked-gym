import type { IconName } from './Icon';
import { EmptyState } from './EmptyState';
import { Screen } from './Screen';

export interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon: IconName;
  /** Phase from docs/PROGRESS.md that will build this screen. */
  phase: string;
}

/** Temporary body for screens that are not built yet. Lives inside a top-tab layout (no top inset). */
export function PlaceholderScreen({ title, description, icon, phase }: PlaceholderScreenProps) {
  return (
    <Screen edges={[]} scroll padded={false}>
      <EmptyState icon={icon} title={title} description={`${description}\n\nComing in ${phase}.`} />
    </Screen>
  );
}
