import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function BoardsPanel({ visible, onClose }: Props) {
  const {
    boards,
    currentBoard,
    createBoard,
    switchBoard,
    renameBoard,
    deleteBoard,
    duplicateBoard,
  } = useBoard();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'updated' | 'name'>('updated');
  const [, setClock] = useState(0);
  const visibleBoards = [...boards]
    .filter((board) => board.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt);

  const saveName = (boardId: string, fallback: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Board name required', 'Enter a name before saving.');
      return;
    }
    renameBoard(boardId, trimmed || fallback);
    setEditingId(null);
  };


  React.useEffect(() => {
    if (!visible) return undefined;
    const timer = setInterval(() => setClock((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Saved boards"
      subtitle="Everything stays on this device."
      icon="grid-outline"
    >
      <Pressable
        style={styles.newBtn}
        onPress={() => {
          createBoard();
          onClose();
        }}
      >
        <Ionicons name="add" size={18} color={colors.cream} />
        <Text style={styles.newText}>New board</Text>
      </Pressable>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search boards"
        placeholderTextColor={colors.mutedInk}
        style={styles.search}
        accessibilityLabel="Search boards"
      />
      <View style={styles.sortRow}>
        <Pressable style={[styles.sortChip, sort === 'updated' && styles.sortChipActive]} onPress={() => setSort('updated')}>
          <Text style={[styles.sortText, sort === 'updated' && styles.sortTextActive]}>Recent</Text>
        </Pressable>
        <Pressable style={[styles.sortChip, sort === 'name' && styles.sortChipActive]} onPress={() => setSort('name')}>
          <Text style={[styles.sortText, sort === 'name' && styles.sortTextActive]}>Name</Text>
        </Pressable>
      </View>

      {visibleBoards.map((board) => {
        const active = board.id === currentBoard.id;
        const editing = editingId === board.id;
        return (
          <Pressable
            key={board.id}
            style={[styles.row, active && styles.rowActive]}
            onPress={() => {
              switchBoard(board.id);
              onClose();
            }}
            onLongPress={() => {
              setEditingId(board.id);
              setName(board.name);
            }}
          >
            <View style={styles.thumb}>
              {board.items.slice(0, 6).map((it, i) => (
                <View
                  key={it.id}
                  style={[
                    styles.thumbDot,
                    {
                      left: 8 + (i % 3) * 18,
                      top: 8 + Math.floor(i / 3) * 18,
                      backgroundColor:
                        it.type === 'image' ? '#8aa4b0' : it.backgroundColor ?? '#d9c6a8',
                    },
                  ]}
                />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <View style={styles.editWrap}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      saveName(board.id, board.name);
                    }}
                    style={styles.nameInput}
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={() => {
                      saveName(board.id, board.name);
                    }} accessibilityLabel={`Save name for ${board.name}`}>
                      <Text style={styles.editAction}>Save</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingId(null)} accessibilityLabel="Cancel board rename">
                      <Text style={styles.editActionMuted}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={styles.name}>{board.name}</Text>
              )}
              <Text style={styles.meta}>{board.items.length} items · {relativeTime(board.updatedAt)}</Text>
            </View>
            {active ? <Ionicons name="checkmark-circle" size={20} color={colors.clayDeep} /> : null}
            <Pressable onPress={() => duplicateBoard(board.id)} hitSlop={8} accessibilityLabel={`Duplicate ${board.name}`}>
              <Ionicons name="copy-outline" size={18} color={colors.mutedInk} />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert(active ? 'Delete active board?' : 'Delete board?', active ? `${board.name} will be deleted and Fieldnote will switch to the next board.` : board.name, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteBoard(board.id),
                  },
                ]);
              }}
              hitSlop={8}
              accessibilityLabel={`Delete ${board.name}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
            </Pressable>
          </Pressable>
        );
      })}
    </ModalShell>
  );
}

function relativeTime(time: number) {
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  newBtn: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  newText: {
    color: colors.cream,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.06)',
  },
  rowActive: {
    borderColor: colors.clayDeep,
  },
  search: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    borderRadius: 999,
    backgroundColor: colors.paperStrong,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sortChipActive: { backgroundColor: colors.walnut },
  sortText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  sortTextActive: { color: colors.cream },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  thumbDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  name: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  nameInput: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    padding: 0,
  },
  editWrap: {
    gap: 6,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editAction: {
    color: colors.clayDeep,
    fontWeight: '900',
    fontSize: 12,
  },
  editActionMuted: {
    color: colors.mutedInk,
    fontWeight: '700',
    fontSize: 12,
  },
  meta: {
    color: colors.mutedInk,
    fontSize: 12,
    marginTop: 2,
  },
});
