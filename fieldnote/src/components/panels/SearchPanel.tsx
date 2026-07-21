import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { groupSearchResults, itemMatchesSearch, SearchTypeFilter, searchResultLabel } from '../../lib/searchFilters';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFocusItem: (x: number, y: number) => void;
}

export function SearchPanel({ visible, onClose, onFocusItem }: Props) {
  const { currentBoard, hiddenIds, select, setPanel, revealMindPath } = useBoard();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchTypeFilter>('everything');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setType('everything');
      setShowAll(false);
    }
  }, [visible]);

  useEffect(() => {
    setShowAll(false);
  }, [query, type]);

  const results = useMemo(() => {
    return currentBoard.items.filter((it) => itemMatchesSearch(it, query, type));
  }, [currentBoard.items, query, type]);
  const visibleResults = showAll ? results : results.slice(0, 30);
  const grouped = groupSearchResults(visibleResults);

  const filters: SearchTypeFilter[] = ['everything', 'text', 'image', 'file', 'task', 'mindmap', 'region'];

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
      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.label}>No matches yet</Text>
          <Text style={styles.meta}>Try a task, region label, file name, or hidden mind-map branch.</Text>
        </View>
      ) : null}
      {Object.entries(grouped).map(([group, items]) => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupTitle}>{group}</Text>
          {items.map((it) => {
        const label = searchResultLabel(it);
        return (
          <Pressable
            key={it.id}
            style={styles.row}
            onPress={() => {
              select([it.id]);
              if (hiddenIds.has(it.id)) revealMindPath(it.id);
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
              <Text style={styles.meta}>{it.type}{hiddenIds.has(it.id) ? ' · hidden in collapsed branch' : ''}</Text>
            </View>
          </Pressable>
        );
      })}
        </View>
      ))}
      {!showAll && results.length > visibleResults.length ? (
        <Pressable style={styles.clearBtn} onPress={() => setShowAll(true)}>
          <Text style={styles.clearText}>Show {results.length - visibleResults.length} more</Text>
        </Pressable>
      ) : null}
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
  empty: {
    padding: 14,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
    gap: 4,
  },
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
  group: { gap: 8 },
  groupTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
});
