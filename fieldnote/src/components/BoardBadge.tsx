import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';

export function BoardBadge() {
  const { currentBoard, renameBoard, dirty, saving } = useBoard();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(currentBoard.name);
  React.useEffect(() => setName(currentBoard.name), [currentBoard.name]);
  return (
    <Pressable
      style={[styles.badge, shadows.control]}
      onPress={() => setEditing(true)}
      accessibilityLabel="Current board. Tap to rename"
    >
      <Text style={styles.eyebrow}>CURRENT BOARD</Text>
      <View style={styles.row}>
        <Ionicons name="grid" size={14} color={colors.clayDeep} />
        {editing ? (
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            onBlur={() => {
              renameBoard(currentBoard.id, name.trim() || currentBoard.name);
              setEditing(false);
            }}
            style={styles.nameInput}
          />
        ) : (
          <Text style={styles.name} numberOfLines={1}>
            {currentBoard.name}
          </Text>
        )}
        <View style={[styles.saveDot, dirty && styles.saveDirty, saving && styles.saveSaving]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    top: 12,
    backgroundColor: colors.paperStrong,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
    zIndex: 40,
    maxWidth: '62%',
  },
  eyebrow: {
    color: colors.mutedInk,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  name: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  nameInput: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 130,
    padding: 0,
  },
  saveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(52,38,29,0.18)',
  },
  saveDirty: {
    backgroundColor: colors.saveDot,
  },
  saveSaving: {
    backgroundColor: colors.clayDeep,
  },
});
