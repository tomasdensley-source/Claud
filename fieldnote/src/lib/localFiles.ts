import * as FileSystem from 'expo-file-system/legacy';

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
  return name ? `fieldnote-files/${name}` : uri;
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

export async function persistedAssetExists(uri?: string): Promise<boolean> {
  if (!uri) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

export function humanFileSize(size?: number) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
