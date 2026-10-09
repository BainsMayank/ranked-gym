import type { IconName } from '@/components';
import type { Equipment } from '@/lib/exercises';

/** One monochrome Ionicon per equipment type (UI icons stay neutral; MOBILE-DESIGN.md). */
const icons: Record<Equipment, IconName> = {
  barbell: 'barbell-outline',
  dumbbell: 'barbell-outline',
  kettlebell: 'fitness-outline',
  machine: 'grid-outline',
  cable: 'git-pull-request-outline',
  smith: 'barbell-outline',
  bodyweight: 'body-outline',
  band: 'infinite-outline',
  other: 'ellipse-outline',
};

export function equipmentIcon(equipment: Equipment | undefined): IconName {
  return equipment ? icons[equipment] : 'help-circle-outline';
}
