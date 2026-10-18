import * as Haptics from 'expo-haptics';

// Thin, always-safe wrapper: haptics confirm an action, they never gate one.
// A device without haptics support (or a denied capability) should never
// throw and interrupt the action it was meant to celebrate.
function safe(run: () => Promise<void>) {
  run().catch(() => {});
}

export const haptics = {
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
