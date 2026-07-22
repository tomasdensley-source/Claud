import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import { formatZoomPercent } from '../lib/camera';
import { hapticImpact, hapticSelection, hapticWarning } from '../lib/haptics';

interface Props {
  scale: number;
  selectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFit: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onBringFront?: () => void;
  onSendBack?: () => void;
  minScale?: number;
  maxScale?: number;
}

function buzz(fn?: () => void, kind: 'select' | 'light' | 'medium' | 'warn' = 'select') {
  if (kind === 'select') void hapticSelection();
  else if (kind === 'light') void hapticImpact('light');
  else if (kind === 'medium') void hapticImpact('medium');
  else void hapticWarning();
  fn?.();
}

export function ZoomControls({
  scale,
  selectedCount,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  onBringFront,
  onSendBack,
  minScale = 0.01,
  maxScale = 80,
}: Props) {
  return (
    <View style={styles.wrap}>
      {selectedCount > 0 ? (
        <View style={[styles.bar, shadows.control, styles.selectionBar]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedCount}</Text>
          </View>
          <Text style={styles.selectionText}>selected</Text>
          <Pressable
            onPress={() => buzz(onBringFront, 'light')}
            style={styles.iconBtn}
            accessibilityLabel="Bring forward"
          >
            <Ionicons name="arrow-up" size={18} color={colors.cream} />
          </Pressable>
          <Pressable
            onPress={() => buzz(onSendBack, 'light')}
            style={styles.iconBtn}
            accessibilityLabel="Send backward"
          >
            <Ionicons name="arrow-down" size={18} color={colors.cream} />
          </Pressable>
          <Pressable
            onPress={() => buzz(onDuplicate, 'medium')}
            style={styles.iconBtn}
            accessibilityLabel="Duplicate"
          >
            <Ionicons name="copy-outline" size={18} color={colors.cream} />
          </Pressable>
          <Pressable
            onPress={() => buzz(onDelete, 'warn')}
            style={styles.iconBtn}
            accessibilityLabel="Delete"
          >
            <Ionicons name="trash-outline" size={18} color={colors.cream} />
          </Pressable>
        </View>
      ) : null}
      <View style={[styles.bar, shadows.control]}>
        <Pressable
          onPress={() => buzz(onUndo, 'medium')}
          disabled={!canUndo}
          style={[styles.iconBtn, !canUndo && styles.disabled]}
          accessibilityLabel="Undo"
        >
          <Ionicons name="arrow-undo" size={18} color={colors.cream} />
        </Pressable>
        <Pressable
          onPress={() => buzz(onRedo, 'medium')}
          disabled={!canRedo}
          style={[styles.iconBtn, !canRedo && styles.disabled]}
          accessibilityLabel="Redo"
        >
          <Ionicons name="arrow-redo" size={18} color={colors.cream} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          onPress={() => buzz(onZoomOut)}
          disabled={scale <= minScale + 0.001}
          style={[styles.iconBtn, scale <= minScale + 0.001 && styles.disabled]}
          accessibilityLabel="Zoom out"
        >
          <Ionicons name="remove" size={20} color={colors.cream} />
        </Pressable>
        <Pressable
          onPress={() => buzz(onResetZoom, 'light')}
          style={styles.zoomPct}
          accessibilityLabel="Reset zoom"
        >
          <Text style={styles.zoomText}>{formatZoomPercent(scale)}</Text>
        </Pressable>
        <Pressable
          onPress={() => buzz(onZoomIn)}
          disabled={scale >= maxScale - 0.001}
          style={[styles.iconBtn, scale >= maxScale - 0.001 && styles.disabled]}
          accessibilityLabel="Zoom in"
        >
          <Ionicons name="add" size={20} color={colors.cream} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          onPress={() => buzz(onFit, 'medium')}
          style={styles.fitBtn}
          accessibilityLabel="Fit entire board"
        >
          <Ionicons name="expand-outline" size={18} color={colors.cream} />
          <Text style={styles.fitText}>Fit</Text>
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
  disabled: {
    opacity: 0.35,
  },
  zoomPct: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  zoomText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
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
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.clayDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 4,
  },
  badgeText: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
  },
});
