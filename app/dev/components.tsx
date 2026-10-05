import { Redirect } from 'expo-router';

import { ComponentGalleryScreen } from '@/features/dev/screens/ComponentGalleryScreen';

/** Dev builds only: production builds redirect home. */
export default function DevComponentsRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <ComponentGalleryScreen />;
}
