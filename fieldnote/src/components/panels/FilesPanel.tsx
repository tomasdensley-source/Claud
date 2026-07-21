import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
}

export function FilesPanel({ visible, onClose, viewCenter }: Props) {
  const { currentBoard, addItem, select, setPanel } = useBoard();
  const [query, setQuery] = useState('');

  const files = useMemo(
    () =>
      currentBoard.items.filter(
        (it) => it.type === 'file' || it.type === 'folder' || it.type === 'image',
      ),
    [currentBoard.items],
  );

  const filtered = files.filter((it) => {
    const name =
      it.type === 'file' || it.type === 'folder'
        ? it.name
        : it.type === 'image'
          ? it.alt ?? 'Image'
          : '';
    return name.toLowerCase().includes(query.toLowerCase());
  });

  const upload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    result.assets.forEach((asset, i) => {
      addItem({
        type: 'file',
        x: viewCenter.x - 120 + i * 20,
        y: viewCenter.y - 60 + i * 20,
        width: 240,
        height: 120,
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        backgroundColor: colors.paperStrong,
      });
    });
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
          <Text style={styles.emptyTitle}>{files.length} files on this device</Text>
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
