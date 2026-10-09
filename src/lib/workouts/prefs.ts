import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import type { Equipment } from '@/lib/exercises/taxonomy';

import type { Intensity, SessionLength } from './generator/generate';

/**
 * Per-device logging preferences (not synced): rest timer sound, whether we've asked for
 * notification permission, and the generator's last choices. Stored in the SQLite key-value store.
 */
export interface WorkoutPrefs {
  /** Play a sound when a rest ends (vibration always happens). */
  restSound: boolean;
  /** The "buzz when rest is over?" prompt has been answered. */
  notifyAsked: boolean;
  generator: {
    minutes: SessionLength;
    equipment: Equipment[] | null;
    intensity: Intensity;
  };
}

const KEY = 'workout-prefs';

const DEFAULTS: WorkoutPrefs = {
  restSound: true,
  notifyAsked: false,
  generator: { minutes: 45, equipment: null, intensity: 'moderate' },
};

function read(): WorkoutPrefs {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return DEFAULTS;
    const saved = JSON.parse(raw) as Partial<WorkoutPrefs>;
    return { ...DEFAULTS, ...saved, generator: { ...DEFAULTS.generator, ...saved.generator } };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsState extends WorkoutPrefs {
  update: (patch: Partial<WorkoutPrefs>) => void;
}

export const useWorkoutPrefs = create<PrefsState>()((set, get) => ({
  ...read(),
  update: (patch) => {
    set(patch);
    const { update: _u, ...prefs } = { ...get() };
    try {
      Storage.setItemSync(KEY, JSON.stringify(prefs));
    } catch {
      // A preference that doesn't stick is not worth an error.
    }
  },
}));
