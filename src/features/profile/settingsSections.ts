import type { IconName } from '@/components';

export const settingsSectionIds = [
  'account',
  'appearance',
  'units',
  'notifications',
  'privacy',
  'data',
] as const;

export type SettingsSectionId = (typeof settingsSectionIds)[number];

export interface SettingsSection {
  id: SettingsSectionId;
  title: string;
  icon: IconName;
  description: string;
}

export const settingsSections: Record<SettingsSectionId, SettingsSection> = {
  account: {
    id: 'account',
    title: 'Account',
    icon: 'person-outline',
    description: 'Sign in, sign up, email and password. Coming in Phase 1.',
  },
  appearance: {
    id: 'appearance',
    title: 'Appearance',
    icon: 'color-palette-outline',
    description: 'Dark, light, or follow your system setting.',
  },
  units: {
    id: 'units',
    title: 'Units',
    icon: 'barbell-outline',
    description: 'Kilograms or pounds. Coming in Phase 11.',
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    description: 'Streak reminders, friend activity, league results. Coming in Phase 12.',
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy',
    icon: 'lock-closed-outline',
    description: 'Who can see your workouts, ranks and profile. Coming in Phase 11.',
  },
  data: {
    id: 'data',
    title: 'Your data',
    icon: 'download-outline',
    description: 'Export all your data, or delete your account. Coming in Phase 11.',
  },
};

export function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return typeof value === 'string' && (settingsSectionIds as readonly string[]).includes(value);
}
