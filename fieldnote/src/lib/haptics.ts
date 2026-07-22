/** Soft haptics — never crash if native module is missing. */

type Impact = 'light' | 'medium' | 'heavy';

let Haptics: null | {
  impactAsync: (style: unknown) => Promise<void>;
  selectionAsync: () => Promise<void>;
  notificationAsync: (type: unknown) => Promise<void>;
  ImpactFeedbackStyle: Record<string, unknown>;
  NotificationFeedbackType: Record<string, unknown>;
} = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

export async function hapticImpact(style: Impact = 'light'): Promise<void> {
  if (!Haptics) return;
  try {
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    await Haptics.impactAsync(map[style]);
  } catch {
    // ignore
  }
}

export async function hapticSelection(): Promise<void> {
  if (!Haptics) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!Haptics) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}
