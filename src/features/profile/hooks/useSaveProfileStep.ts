import { useState } from 'react';

import { useProfile, useUpdateProfile, type Profile, type ProfileUpdate } from '@/lib/profile';

import { profileErrorMessage } from '../api/profileErrors';

/**
 * Saves the fields a step changed, then continues. Skips the network call when nothing changed (going
 * back and forward through onboarding is instant).
 */
export function useSaveProfileStep() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [error, setError] = useState<string | null>(null);

  const save = async (changes: ProfileUpdate, then: (saved: Profile | undefined) => void) => {
    setError(null);
    const changed = Object.entries(changes).some(
      ([key, value]) => profile?.[key as keyof Profile] !== value,
    );
    if (!changed) {
      then(profile);
      return;
    }
    try {
      then(await update.mutateAsync(changes));
    } catch (e) {
      setError(profileErrorMessage(e));
    }
  };

  return { profile, save, saving: update.isPending, error, setError };
}
