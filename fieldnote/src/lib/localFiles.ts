import * as FileSystem from 'expo-file-system/legacy';

export const PACKAGE_BLOB_SIZE_LIMIT = 2 * 1024 * 1024;
const PORTABLE_PREFIX = 'fieldnote-files/';

type PickedAsset = {
  uri: string;
  name?: string | null;
};

function safeName(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  const dot = clean.lastIndexOf('.');
  if (clean.length <= 96 || dot <= 0) return clean.slice(0, 96) || 'file';
  const ext = clean.slice(dot).slice(0, 16);
  return `${clean.slice(0, Math.max(1, 96 - ext.length))}${ext}`;
}

export function fieldnoteFilesDirectory() {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}fieldnote-files/` : null;
}

export function localFileName(uri?: string) {
  const dir = fieldnoteFilesDirectory();
  if (!uri || !dir || !uri.startsWith(dir)) return null;
  return uri.slice(dir.length);
}

export function toPortableUri(uri?: string) {
  const name = localFileName(uri);
  return name ? `${PORTABLE_PREFIX}${name}` : uri;
}

export function fromPortableUri(uri?: string) {
  if (!uri?.startsWith(PORTABLE_PREFIX)) return uri;
  const dir = fieldnoteFilesDirectory();
  return dir ? `${dir}${uri.slice(PORTABLE_PREFIX.length)}` : uri;
}

export function portableBlobKey(uri?: string) {
  const portable = toPortableUri(uri);
  return portable?.startsWith(PORTABLE_PREFIX) ? portable : undefined;
}

export function isPersistedFieldnoteFile(uri?: string) {
  const dir = fieldnoteFilesDirectory();
  return Boolean(uri && dir && uri.startsWith(dir));
}

export async function persistPickedAsset(asset: PickedAsset): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory || asset.uri.startsWith(documentDirectory)) return asset.uri;

  const dir = fieldnoteFilesDirectory() ?? `${documentDirectory}fieldnote-files/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

  const name = safeName(asset.name ?? asset.uri.split('/').pop() ?? 'file');
  const destination = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  return destination;
}

export async function clearPersistedAssets(): Promise<void> {
  const dir = fieldnoteFilesDirectory();
  if (!dir) return;
  await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => undefined);
}

export async function deletePersistedAsset(uri?: string): Promise<void> {
  if (!isPersistedFieldnoteFile(uri) || !uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

export async function directoryUsage(): Promise<number> {
  const dir = fieldnoteFilesDirectory();
  if (!dir) return 0;
  try {
    const names = await FileSystem.readDirectoryAsync(dir);
    const sizes = await Promise.all(names.map(async (name) => {
      const info = await FileSystem.getInfoAsync(`${dir}${name}`);
      return info.exists && !info.isDirectory && typeof info.size === 'number' ? info.size : 0;
    }));
    return sizes.reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
}

export async function persistedAssetExists(uri?: string): Promise<boolean> {
  const resolved = fromPortableUri(uri);
  if (!resolved) return false;
  try {
    const info = await FileSystem.getInfoAsync(resolved);
    return info.exists;
  } catch {
    return false;
  }
}

export async function readPortableBlob(uri?: string, sizeHint?: number): Promise<{ key: string; base64?: string; size?: number; skipped?: string }> {
  const key = portableBlobKey(uri);
  const resolved = fromPortableUri(uri);
  if (!key || !resolved) throw new Error('Only Fieldnote-managed files can be embedded.');
  const info = await FileSystem.getInfoAsync(resolved);
  if (!info.exists || info.isDirectory) return { key, skipped: 'missing' };
  const size = typeof info.size === 'number' ? info.size : sizeHint;
  if (size && size > PACKAGE_BLOB_SIZE_LIMIT) return { key, size, skipped: 'over-size-cap' };
  const base64 = await FileSystem.readAsStringAsync(resolved, { encoding: FileSystem.EncodingType.Base64 });
  return { key, base64, size };
}

export async function writePortableBlob(key: string, base64: string): Promise<string> {
  if (!key.startsWith(PORTABLE_PREFIX)) throw new Error('Invalid Fieldnote blob path.');
  const dir = fieldnoteFilesDirectory();
  if (!dir) throw new Error('Fieldnote file storage is unavailable.');
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const destination = `${dir}${key.slice(PORTABLE_PREFIX.length)}`;
  await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}

export function humanFileSize(size?: number) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
