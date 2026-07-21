import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { humanFileSize, persistPickedAsset } from '../../lib/localFiles';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
  onFocusItem: (x: number, y: number) => void;
}

export function FilesPanel({ visible, onClose, viewCenter, onFocusItem }: Props) {
  const { currentBoard, addItem, select, setPanel, workingFiles, addWorkingFiles, removeWorkingFile, showToast } = useBoard();
  const [query, setQuery] = useState('');

  const files = useMemo(
    () => currentBoard.items.filter((it) => it.type === 'file' || it.type === 'folder' || it.type === 'image'),
    [currentBoard.items],
  );

  const fileCardType = (mimeType?: string, name?: string) => {
    const lower = `${mimeType ?? ''} ${name ?? ''}`.toLowerCase();
    if (lower.includes('pdf') || lower.endsWith('.pdf')) return 'pdf' as const;
    if (lower.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(lower)) return 'audio' as const;
    if (lower.includes('markdown') || /\.(md|markdown)$/.test(lower)) return 'markdown' as const;
    return 'file' as const;
  };

  const filtered = files.filter((it) => {
    const name =
      it.type === 'file' || it.type === 'folder'
        ? it.name
        : it.type === 'image'
          ? it.alt ?? 'Image'
          : '';
    const libraryHit = workingFiles.some((file) => file.name.toLowerCase().includes(query.toLowerCase()));
    return name.toLowerCase().includes(query.toLowerCase()) || libraryHit;
  });
  const filteredLibrary = workingFiles.filter((file) => file.name.toLowerCase().includes(query.toLowerCase()));

  const upload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['image/*', 'application/pdf', 'text/*', 'audio/*', 'application/json'],
      });
      if (result.canceled) return;
      const assets = await Promise.all(result.assets.map(async (asset) => ({
        ...asset,
        uri: await persistPickedAsset(asset),
      })));
      addWorkingFiles(assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      })));
      assets.forEach((asset, i) => {
        const isImage = (asset.mimeType ?? '').startsWith('image/');
        const cardType = fileCardType(asset.mimeType, asset.name);
        addItem({
          type: isImage ? 'image' : cardType,
          x: viewCenter.x - 120 + i * 20,
          y: viewCenter.y - 60 + i * 20,
          width: isImage ? 260 : 240,
          height: isImage ? 220 : 120,
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType,
          size: asset.size,
          alt: asset.name,
          text: [asset.mimeType, humanFileSize(asset.size)].filter(Boolean).join(' · '),
          backgroundColor: colors.paperStrong,
        } as Parameters<typeof addItem>[0]);
      });
      showToast(`${assets.length} upload${assets.length === 1 ? '' : 's'} complete.`);
    } catch (e) {
      Alert.alert('Could not upload files', String(e));
    }
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Working files"
      subtitle="Files stay on this device until you place them."
      icon="folder-outline"
    >
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={upload}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.cream} />
          <Text style={styles.primaryText}>Upload files</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => {
            addItem({
              type: 'folder',
              x: viewCenter.x - 120,
              y: viewCenter.y - 70,
              width: 240,
              height: 140,
              name: 'New folder',
              fileCount: 0,
              backgroundColor: colors.paperStrong,
            });
          }}
        >
          <Ionicons name="folder-open-outline" size={16} color={colors.ink} />
          <Text style={styles.secondaryText}>New folder</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search working files"
        placeholderTextColor={colors.mutedInk}
        style={styles.search}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{workingFiles.length} working files stored</Text>
          <Text style={styles.emptySub}>
            Upload files or choose photos from Add to keep them with this board.
          </Text>
        </View>
      ) : (
        filtered.map((it) => {
          const label =
            it.type === 'file' || it.type === 'folder'
              ? it.name
              : it.type === 'image'
                ? it.alt ?? 'Image'
                : 'Item';
          return (
            <Pressable
              key={it.id}
              style={styles.row}
              onPress={() => {
                select([it.id]);
                onFocusItem(it.x + it.width / 2, it.y + it.height / 2);
                setPanel(null);
                onClose();
              }}
            >
              <Text style={styles.glyph}>
                {it.type === 'folder' ? '📁' : it.type === 'image' ? '🖼' : '📄'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.meta}>{it.type}</Text>
              </View>
              <Ionicons name="locate-outline" size={18} color={colors.mutedInk} />
            </Pressable>
          );
        })
      )}
      {workingFiles.length ? (
        <>
          <Text style={styles.section}>Library</Text>
          {filteredLibrary.map((file) => (
            <Pressable
              key={file.id}
              style={styles.row}
              onPress={() => {
                addItem({
                  type: (file.mimeType ?? '').startsWith('image/') ? 'image' : fileCardType(file.mimeType, file.name),
                  x: viewCenter.x - 120,
                  y: viewCenter.y - 60,
                  width: 260,
                  height: (file.mimeType ?? '').startsWith('image/') ? 220 : 120,
                  name: file.name,
                  uri: file.uri,
                  mimeType: file.mimeType,
                  size: file.size,
                  alt: file.name,
                  text: [file.mimeType, humanFileSize(file.size)].filter(Boolean).join(' · '),
                  backgroundColor: colors.paperStrong,
                } as Parameters<typeof addItem>[0]);
                showToast(`${file.name} placed on board.`);
                onClose();
              }}
            >
              <Text style={styles.glyph}>{(file.mimeType ?? '').startsWith('image/') ? 'Image' : 'File'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{file.name}</Text>
                <Text style={styles.meta}>{[file.mimeType ?? 'document', humanFileSize(file.size)].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable onPress={() => removeWorkingFile(file.id)} hitSlop={8} accessibilityLabel={`Remove ${file.name}`}>
                <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
              </Pressable>
            </Pressable>
          ))}
        </>
      ) : null}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  primaryText: { color: colors.cream, fontWeight: '700' },
  secondary: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  search: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  empty: {
    padding: 18,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
  },
  emptyTitle: { color: colors.ink, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: colors.mutedInk, lineHeight: 18 },
  section: { color: colors.ink, fontWeight: '800', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.paperStrong,
  },
  glyph: { fontSize: 22 },
  name: { color: colors.ink, fontWeight: '600' },
  meta: { color: colors.mutedInk, fontSize: 12 },
});
