import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface Props {
  scale: number;
  selectedCount: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function ZoomControls({
  scale,
  selectedCount,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <View style={styles.wrap}>
      {selectedCount > 0 ? (
        <View style={[styles.bar, shadows.control, styles.selectionBar]}>
          <Text style={styles.selectionText}>{selectedCount} selected</Text>
          <Pressable onPress={onDuplicate} style={styles.iconBtn} accessibilityLabel="Duplicate">
            <Ionicons name="copy-outline" size={18} color={colors.cream} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconBtn} accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={18} color={colors.cream} />
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.bar, shadows.control]}>
        <Pressable onPress={onZoomOut} style={styles.iconBtn} accessibilityLabel="Zoom out">
          <Ionicons name="remove" size={20} color={colors.cream} />
        </Pressable>
        <Pressable onPress={onResetZoom} style={styles.zoomPct} accessibilityLabel="Reset zoom">
          <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
        </Pressable>
        <Pressable onPress={onZoomIn} style={styles.iconBtn} accessibilityLabel="Zoom in">
          <Ionicons name="add" size={20} color={colors.cream} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={onFit} style={styles.fitBtn} accessibilityLabel="Fit entire board">
          <Ionicons name="expand-outline" size={18} color={colors.cream} />
          <Text style={styles.fitText}>Fit board</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    gap: 8,
    zIndex: 40,
    alignItems: 'flex-end',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  selectionBar: {
    paddingHorizontal: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPct: {
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  zoomText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 4,
  },
  fitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    height: 36,
  },
  fitText: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  selectionText: {
    color: 'rgba(255,250,240,0.8)',
    fontSize: 12,
    marginRight: 6,
  },
});
