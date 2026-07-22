/** Soft haptics — never crash if native module is missing. */

type Impact = 'light' | 'medium' | 'heavy';

let Haptics: null | {
  impactAsync: (style: unknown) => Promise<void>;
  selectionAsync: () => Promise<void>;
  notificationAsync: (type: unknown) => Promise<void>;
  ImpactFeedbackStyle: Record<string, unknown>;
  NotificationFeedbackType: Record<string, unknown>;
} = null;

let enabled = true;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

/** Allow callers to mute haptics (e.g. reduced-motion preference). */
export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

export function hapticsAvailable(): boolean {
  return Haptics != null && enabled;
}

export async function hapticImpact(style: Impact = 'light'): Promise<void> {
  if (!Haptics || !enabled) return;
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
  if (!Haptics || !enabled) return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!Haptics || !enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}

export async function hapticWarning(): Promise<void> {
  if (!Haptics || !enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // ignore
  }
}

export async function hapticError(): Promise<void> {
  if (!Haptics || !enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // ignore
  }
}
