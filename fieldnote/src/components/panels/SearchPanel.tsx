import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFocusItem: (x: number, y: number) => void;
}

type TypeFilter = 'everything' | 'text' | 'image' | 'file' | 'task';

export function SearchPanel({ visible, onClose, onFocusItem }: Props) {
  const { visibleItems, select, setPanel } = useBoard();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('everything');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleItems.filter((it) => {
      if (type !== 'everything') {
        if (type === 'file' && !(it.type === 'file' || it.type === 'folder')) return false;
        else if (type !== 'file' && it.type !== type) return false;
      }
      if (!q) return true;
      if (it.type === 'text' || it.type === 'task' || it.type === 'mindmap') {
        return it.text.toLowerCase().includes(q);
      }
      if (it.type === 'file' || it.type === 'folder') return it.name.toLowerCase().includes(q);
      if (it.type === 'image') return (it.alt ?? 'image').toLowerCase().includes(q);
      if (it.type === 'region') return it.label.toLowerCase().includes(q);
      return it.type.includes(q);
    });
  }, [visibleItems, query, type]);

  const filters: TypeFilter[] = ['everything', 'text', 'image', 'file', 'task'];

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Find anything"
      subtitle="Search cards, files, and notes on this board."
      icon="search-outline"
    >
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search cards, files, and notes..."
        placeholderTextColor={colors.mutedInk}
        style={styles.search}
        autoFocus
      />
      {query ? (
        <Pressable style={styles.clearBtn} onPress={() => setQuery('')} accessibilityLabel="Clear search">
          <Ionicons name="close-circle-outline" size={16} color={colors.ink} />
          <Text style={styles.clearText}>Clear search</Text>
        </Pressable>
      ) : null}
      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[styles.chip, type === f && styles.chipActive]}
            onPress={() => setType(f)}
          >
            <Text style={[styles.chipText, type === f && styles.chipTextActive]}>
              {f[0].toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.count}>{results.length} results</Text>
      {results.map((it) => {
        const label =
          it.type === 'text' || it.type === 'task' || it.type === 'mindmap'
            ? it.text.slice(0, 80) || 'Untitled'
            : it.type === 'file' || it.type === 'folder'
              ? it.name
              : it.type === 'image'
                ? it.alt ?? 'Image'
                : it.type === 'region'
                  ? it.label
                  : it.type;
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
                it.type === 'image'
                  ? 'image-outline'
                  : it.type === 'task'
                    ? 'checkbox-outline'
                    : it.type === 'file'
                      ? 'document-outline'
                      : 'text-outline'
              }
              size={18}
              color={colors.ink}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.label} numberOfLines={2}>
                {label}
              </Text>
              <Text style={styles.meta}>{it.type}</Text>
            </View>
          </Pressable>
        );
      })}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.paperStrong,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  chipActive: {
    backgroundColor: colors.walnut,
    borderColor: colors.walnut,
  },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.cream },
  count: { color: colors.mutedInk, fontSize: 12 },
  clearBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paperStrong,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.paperStrong,
  },
  label: { color: colors.ink, fontWeight: '600' },
  meta: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
});
