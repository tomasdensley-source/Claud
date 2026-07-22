import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { DraftBoardItem } from '../types';
import { colors } from '../theme';
import { placeAtPoint } from './placement';
import { estimatePdfPages, isPdfAsset } from './pdf';

export type PlaceFilesResult = DraftBoardItem[];

/** Soft-copy picked media into documentDirectory; fall back to cache/source uri. */
async function persistLocalUri(sourceUri: string, nameHint?: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system');
    const root = FileSystem.documentDirectory as string | null;
    if (!root) return sourceUri;
    const dir = `${root}fieldnote-files/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const safe =
      (nameHint || 'file')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 80) || 'file';
    const dest = `${dir}${Date.now()}-${safe}`;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return sourceUri;
  }
}

export async function pickAndBuildFileItems(
  anchor: { x: number; y: number },
): Promise<PlaceFilesResult> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ['*/*', 'application/pdf', 'image/*'],
  });
  if (result.canceled) return [];
  const items: PlaceFilesResult = [];
  for (let i = 0; i < result.assets.length; i++) {
    const asset = result.assets[i];
    const uri = await persistLocalUri(asset.uri, asset.name);
    const isImage = (asset.mimeType ?? '').startsWith('image/');
    if (isImage) {
      const { x, y } = placeAtPoint(anchor, 280, 280, i);
      items.push({
        type: 'image',
        x,
        y,
        width: 280,
        height: 280,
        uri,
        alt: asset.name,
        backgroundColor: colors.paper,
      });
      continue;
    }
    if (isPdfAsset(asset.name, asset.mimeType)) {
      const pages = estimatePdfPages(asset.size);
      const { x, y } = placeAtPoint(anchor, 220, 300, i);
      items.push({
        type: 'file',
        x,
        y,
        width: 220,
        height: 300,
        name: asset.name || 'Document.pdf',
        uri,
        mimeType: asset.mimeType ?? 'application/pdf',
        pageCount: pages,
        sizeBytes: asset.size,
        backgroundColor: colors.paperStrong,
      });
      continue;
    }
    const { x, y } = placeAtPoint(anchor, 240, 120, i);
    items.push({
      type: 'file',
      x,
      y,
      width: 240,
      height: 120,
      name: asset.name || 'File',
      uri,
      mimeType: asset.mimeType,
      sizeBytes: asset.size,
      backgroundColor: colors.paperStrong,
    });
  }
  return items;
}

export async function pickAndBuildPhotoItems(
  anchor: { x: number; y: number },
): Promise<PlaceFilesResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow photo library access to place images.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.85,
  });
  if (result.canceled) return [];
  const items: PlaceFilesResult = [];
  for (let i = 0; i < result.assets.length; i++) {
    const asset = result.assets[i];
    const uri = await persistLocalUri(asset.uri, `photo-${i}.jpg`);
    const height = Math.round(300 * (asset.height / Math.max(asset.width, 1)));
    const { x, y } = placeAtPoint(anchor, 300, height, i);
    items.push({
      type: 'image',
      x,
      y,
      width: 300,
      height: Math.max(120, height),
      uri,
      alt: 'Photo',
      backgroundColor: colors.paper,
    });
  }
  return items;
}
