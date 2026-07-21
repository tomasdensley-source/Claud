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
  const [, setClock] = useState(0);

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

      {boards.map((board) => {
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
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onBlur={() => {
                    renameBoard(board.id, name.trim() || board.name);
                    setEditingId(null);
                  }}
                  autoFocus
                  style={styles.nameInput}
                />
              ) : (
                <Text style={styles.name}>{board.name}</Text>
              )}
              <Text style={styles.meta}>{board.items.length} items · {relativeTime(board.updatedAt)}</Text>
            </View>
            {active ? <Ionicons name="checkmark-circle" size={20} color={colors.clayDeep} /> : null}
            <Pressable onPress={() => duplicateBoard(board.id)} hitSlop={8} accessibilityLabel={`Duplicate ${board.name}`}>
              <Ionicons name="copy-outline" size={18} color={colors.mutedInk} />
            </Pressable>
            {!active ? (
              <Pressable
                onPress={() => {
                  Alert.alert('Delete board?', board.name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteBoard(board.id),
                    },
                  ]);
                }}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
              </Pressable>
            ) : null}
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
  meta: {
    color: colors.mutedInk,
    fontSize: 12,
    marginTop: 2,
  },
});
