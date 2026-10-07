import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SectionHeader } from '@/components';

/** A titled group of fields on a settings-style form. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-md">
      <SectionHeader title={title} />
      {children}
    </View>
  );
}
