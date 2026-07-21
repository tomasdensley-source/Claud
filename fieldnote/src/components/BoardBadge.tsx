import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';

export function BoardBadge() {
  const { currentBoard } = useBoard();
  return (
    <View style={[styles.badge, shadows.control]}>
      <Text style={styles.eyebrow}>CURRENT BOARD</Text>
      <View style={styles.row}>
        <Ionicons name="grid" size={14} color={colors.clayDeep} />
        <Text style={styles.name} numberOfLines={1}>
          {currentBoard.name}
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
});
