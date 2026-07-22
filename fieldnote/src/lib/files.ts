import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { DraftBoardItem } from '../types';
import { colors } from '../theme';
import { placeAtPoint } from './placement';

export type PlaceFilesResult = DraftBoardItem[];

export async function pickAndBuildFileItems(
  anchor: { x: number; y: number },
): Promise<PlaceFilesResult> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset, i) => {
    const isImage = (asset.mimeType ?? '').startsWith('image/');
    if (isImage) {
      const { x, y } = placeAtPoint(anchor, 280, 280, i);
      return {
        type: 'image' as const,
        x,
        y,
        width: 280,
        height: 280,
        uri: asset.uri,
        alt: asset.name,
        backgroundColor: colors.paper,
      };
    }
    const { x, y } = placeAtPoint(anchor, 240, 120, i);
    return {
      type: 'file' as const,
      x,
      y,
      width: 240,
      height: 120,
      name: asset.name || 'File',
      uri: asset.uri,
      mimeType: asset.mimeType,
      backgroundColor: colors.paperStrong,
    };
  });
}

export async function pickAndBuildPhotoItems(
  anchor: { x: number; y: number },
): Promise<PlaceFilesResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to place images.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return result.assets.map((asset, i) => {
    const height = Math.round(300 * (asset.height / Math.max(asset.width, 1)));
    const { x, y } = placeAtPoint(anchor, 300, height, i);
    return {
      type: 'image' as const,
      x,
      y,
      width: 300,
      height: Math.max(120, height),
      uri: asset.uri,
      alt: 'Photo',
      backgroundColor: colors.paper,
    };
  });
}
