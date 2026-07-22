/**
 * Soft wrappers for sharing / clipboard — never crash if native module missing.
 */

export async function shareText(text: string, dialogTitle = 'Share from Fieldnote'): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system');
    const available = await Sharing.isAvailableAsync();
    if (!available) return false;
    const path = `${FileSystem.cacheDirectory}fieldnote-export.canvas`;
    await FileSystem.writeAsStringAsync(path, text);
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle,
      UTI: 'public.json',
    });
    return true;
  } catch (e) {
    console.warn('shareText failed', e);
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch (e) {
    console.warn('copyText failed', e);
    return false;
  }
}

export async function readClipboardText(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard');
    const text = await Clipboard.getStringAsync();
    return text || null;
  } catch {
    return null;
  }
}
