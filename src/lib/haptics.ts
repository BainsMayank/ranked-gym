import * as Haptics from 'expo-haptics';

/**
 * The app's haptic vocabulary (MOBILE-DESIGN.md): selection for pickers, steppers, toggles and
 * drag steps; light impact for a meaningful confirmation; success for PRs and rank-ups. Never on
 * plain taps or navigation. Failures (no haptic engine) are ignored.
 */
export const haptics = {
  selection: () => void Haptics.selectionAsync().catch(() => undefined),
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
};
