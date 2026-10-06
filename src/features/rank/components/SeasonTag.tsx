import { Tag } from '@/components';

import { season } from '../mocks';

/** Current season and time left, for the Rank header. */
export function SeasonTag() {
  return <Tag label={season.label} />;
}
