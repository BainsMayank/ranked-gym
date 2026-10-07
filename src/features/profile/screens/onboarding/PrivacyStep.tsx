import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { profileKeys, visibilityOptions, type ProfileVisibility } from '@/lib/profile';
import { getSupabase } from '@/lib/supabase';

import { profileErrorMessage } from '../../api/profileErrors';
import { ChoiceList } from '../../components/fields/ChoiceList';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import { useSaveProfileStep } from '../../hooks/useSaveProfileStep';

/** Step 8: who can see your profile. Finishing marks onboarding done and opens the welcome screen. */
export function PrivacyStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useSaveProfileStep();
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile?.visibility ?? 'friends');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const { data, error: saveError } = await getSupabase()
        .from('profiles')
        .update({ visibility, onboarded_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select('*')
        .single();
      if (saveError) throw saveError;
      // Leave onboarding first, then tell the gate: updating the cache flips the guards, and doing
      // it while still on this screen would bounce through Home before reaching /ready.
      router.replace('/ready');
      queryClient.setQueryData(profileKeys.detail(data.id), data);
    } catch (e) {
      setError(profileErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      step="privacy"
      title="Who can see your profile?"
      subtitle="Change it any time in Settings → Privacy."
      onContinue={() => void finish()}
      continueLabel="Finish"
      saving={saving}
      error={error}
    >
      <ChoiceList
        label="Profile visibility"
        options={visibilityOptions}
        value={visibility}
        onChange={setVisibility}
      />
    </OnboardingLayout>
  );
}
