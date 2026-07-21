import * as FileSystem from 'expo-file-system/legacy';

type PickedAsset = {
  uri: string;
  name?: string | null;
};

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 96) || 'file';
}

export async function persistPickedAsset(asset: PickedAsset): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory || asset.uri.startsWith(documentDirectory)) return asset.uri;

  const dir = `${documentDirectory}fieldnote-files/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

  const name = safeName(asset.name ?? asset.uri.split('/').pop() ?? 'file');
  const destination = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  return destination;
}

export function humanFileSize(size?: number) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
