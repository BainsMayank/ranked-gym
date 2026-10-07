import { Input } from '@/components';
import type { UsernameStatus } from '@/lib/profile';

interface UsernameFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  /** Format error from the form. */
  error?: string;
  status: UsernameStatus;
}

const STATUS_COPY: Partial<Record<UsernameStatus, string>> = {
  checking: 'Checking…',
  available: 'Available',
  taken: 'That username is taken. Try another.',
  offline: "You're offline. We'll check when you're back.",
  error: "Couldn't check right now. We'll try again when you continue.",
};

/** Username input that lowercases as you type and shows live availability. */
export function UsernameField({ value, onChangeText, onBlur, error, status }: UsernameFieldProps) {
  const statusMessage = STATUS_COPY[status];
  return (
    <Input
      label="Username"
      placeholder="asha_lifts"
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="username-new"
      textContentType="username"
      maxLength={20}
      value={value}
      onChangeText={(text) => onChangeText(text.toLowerCase().replace(/\s/g, '_'))}
      onBlur={onBlur}
      error={error ?? (status === 'taken' ? statusMessage : undefined)}
      helperText={statusMessage ?? 'Letters, numbers and underscores. 3–20 characters.'}
    />
  );
}
