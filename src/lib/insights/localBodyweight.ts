import { Storage } from 'expo-sqlite/kv-store';
import { z } from 'zod';

const key = 'insights.preview.bodyweight';
const schema = z.array(z.object({ id: z.string(), at: z.string(), kg: z.number() }));
/** Account-free development data stays on this device and never posts to the server. */
export function localBodyweight() {
  try {
    return schema.parse(JSON.parse(Storage.getItemSync(key) ?? '[]'));
  } catch {
    return [];
  }
}
export function saveLocalBodyweight(id: string, kg: number, replace = false) {
  const logs = localBodyweight().filter((p) => p.id !== id);
  const existing = localBodyweight().find((p) => p.id === id);
  const row = { id, kg, at: replace && existing ? existing.at : new Date().toISOString() };
  Storage.setItemSync(key, JSON.stringify([...logs, row].sort((a, b) => a.at.localeCompare(b.at))));
  return row;
}
