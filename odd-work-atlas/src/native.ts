// Thin wrappers over Capacitor plugins, with browser fallbacks so the
// same code runs in a desktop browser during development.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNative = () => Capacitor.isNativePlatform();

/** Keeps a second copy of the data in the app's private files on every save. */
export async function writeAutoBackup(json: string) {
  if (!isNative()) return;
  try {
    await Filesystem.writeFile({
      path: 'atlas-autobackup.json',
      data: json,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch {
    /* best effort */
  }
}

export async function readAutoBackup(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const r = await Filesystem.readFile({ path: 'atlas-autobackup.json', directory: Directory.Data, encoding: Encoding.UTF8 });
    return typeof r.data === 'string' ? r.data : null;
  } catch {
    return null;
  }
}

/**
 * Saves a backup file the user controls. On the phone it writes to Documents
 * and opens the share sheet (Drive, email, Files). In a browser it downloads.
 */
export async function saveBackupFile(json: string, filename: string): Promise<string> {
  if (isNative()) {
    const res = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    try {
      await Share.share({ title: 'Odd-Work Atlas backup', url: res.uri, dialogTitle: 'Save your backup' });
    } catch {
      /* user closed the share sheet; the file is still in Documents */
    }
    return `Saved to Documents/${filename}`;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return `Downloaded ${filename}`;
}

/** On the phone, Capacitor hands outside links to Android (Play links open the Play Store). */
export function openExternal(url: string) {
  if (isNative()) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

export function tap() {
  if (isNative()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
