import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { pickAndBuildFileItems } from '../../lib/files';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
  onFocusItem: (x: number, y: number) => void;
  onPlaced?: (label: string) => void;
}

export function FilesPanel({ visible, onClose, viewCenter, onFocusItem, onPlaced }: Props) {
  const { currentBoard, addItem, addItems, select, setPanel } = useBoard();
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
    return name.toLowerCase().includes(query.trim().toLowerCase());
  });

  const upload = async () => {
    const items = await pickAndBuildFileItems(viewCenter);
    if (items.length === 0) return;
    addItems(items);
    onPlaced?.(items.length === 1 ? 'File uploaded' : `${items.length} files uploaded`);
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Working files"
      subtitle="Tap a file to select it and jump the camera there."
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
            onPlaced?.('Folder card added');
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
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Text style={styles.count}>
        {filtered.length} of {files.length} on this board
      </Text>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No matching files</Text>
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
              <Ionicons
                name={
                  it.type === 'folder'
                    ? 'folder'
                    : it.type === 'image'
                      ? 'image'
                      : 'document-text'
                }
                size={22}
                color={colors.clayDeep}
              />
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
  count: {
    color: colors.mutedInk,
    fontSize: 12,
    fontWeight: '600',
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
  name: { color: colors.ink, fontWeight: '600' },
  meta: { color: colors.mutedInk, fontSize: 12 },
});
