import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';

export function BoardBadge() {
  const { currentBoard, lastSavedAt, itemCount } = useBoard();
  const savedLabel =
    lastSavedAt == null
      ? 'Ready'
      : Date.now() - lastSavedAt < 2500
        ? 'Saved'
        : 'Local';

  return (
    <View style={[styles.badge, shadows.control]}>
      <Text style={styles.eyebrow}>CURRENT BOARD</Text>
      <View style={styles.row}>
        <Ionicons name="grid" size={14} color={colors.clayDeep} />
        <Text style={styles.name} numberOfLines={1}>
          {currentBoard.name}
        </Text>
        <View style={styles.dot} />
        <Text style={styles.meta}>
          {savedLabel} · {currentBoard.items.length}/{itemCount}
        </Text>
      </View>
    </View>
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
    maxWidth: '78%',
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
    flexShrink: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.saveDot,
  },
  meta: {
    color: colors.mutedInk,
    fontSize: 11,
    fontWeight: '600',
  },
});
