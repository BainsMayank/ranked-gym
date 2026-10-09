import type { View } from 'react-native';

/** Set rows by set id, so the list can scroll the row being typed into above the keypad. */
export const rowRefs = new Map<string, View>();

export function registerRow(setId: string) {
  return (view: View | null) => {
    if (view) rowRefs.set(setId, view);
    else rowRefs.delete(setId);
  };
}
