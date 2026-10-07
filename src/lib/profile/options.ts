import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

export type SexForStandards = Enums['sex_for_standards'];
export type ExperienceLevel = Enums['experience_level'];
export type PrimaryGoal = Enums['primary_goal'];
export type ProfileVisibility = Enums['profile_visibility'];
export type ThemePreference = Enums['theme_mode'];

interface Option<T extends string> {
  id: T;
  title: string;
  subtitle: string;
}

/** Shared by onboarding, profile editing and the plan generator. Matches the `primary_goal` enum. */
export const goalOptions = [
  { id: 'stronger', title: 'Get stronger', subtitle: 'Raise your lifts and ranks' },
  { id: 'muscle', title: 'Build muscle', subtitle: 'Hypertrophy focus' },
  { id: 'fat', title: 'Lose fat', subtitle: 'Keep strength, drop weight' },
  { id: 'gain', title: 'Gain weight', subtitle: 'Lean bulk structure' },
  { id: 'toned', title: 'Get toned', subtitle: 'Lighter, higher-rep work' },
  { id: 'curvier', title: 'Get curvier', subtitle: 'Glute and lower-body focus' },
  { id: 'calisthenics', title: 'Calisthenics', subtitle: 'Skills and bodyweight strength' },
  { id: 'general', title: 'General fitness', subtitle: 'Balanced, all-round' },
] as const satisfies readonly Option<PrimaryGoal>[];

export const experienceOptions = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'New to lifting, or less than about 6 months of regular training.',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Training regularly for 6 months to 2 years. You know the main lifts well.',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'Over 2 years of serious training. Progress now takes planning.',
  },
] as const satisfies readonly Option<ExperienceLevel>[];

export const sexOptions = [
  { id: 'male', title: "Men's", subtitle: "Ranked on men's standards" },
  { id: 'female', title: "Women's", subtitle: "Ranked on women's standards" },
  { id: 'unspecified', title: 'Rather not say', subtitle: "Ranked on men's (open) standards" },
] as const satisfies readonly Option<SexForStandards>[];

export const visibilityOptions = [
  {
    id: 'public',
    title: 'Public',
    subtitle: 'Anyone can see your profile, and you show on college and city leaderboards.',
  },
  {
    id: 'friends',
    title: 'Friends',
    subtitle: 'Only friends see your details and workouts. Others just see your name.',
  },
  {
    id: 'private',
    title: 'Private',
    subtitle: 'Only you see your details and workouts. You can still add friends.',
  },
] as const satisfies readonly Option<ProfileVisibility>[];

export function optionTitle<T extends string>(
  options: readonly Option<T>[],
  id: T | null | undefined,
): string | undefined {
  return options.find((o) => o.id === id)?.title;
}
