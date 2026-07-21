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
  onFitSelection?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onEdit?: () => void;
  onDeselect?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onRemoveDependency?: () => void;
  onLock?: () => void;
  canPaste?: boolean;
  lockActive?: boolean;
}

export function ZoomControls({
  scale,
  selectedCount,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
  onFitSelection,
  onDuplicate,
  onDelete,
  onCopy,
  onPaste,
  onEdit,
  onDeselect,
  onBringForward,
  onSendBackward,
  onRemoveDependency,
  onLock,
  canPaste,
  lockActive,
}: Props) {
  return (
    <View style={styles.wrap}>
      {selectedCount > 0 ? (
        <View style={[styles.bar, shadows.control, styles.selectionBar]}>
          <Text style={styles.selectionText}>{selectedCount} selected</Text>
          <ActionButton icon="create-outline" label="Edit" onPress={onEdit} />
          <Pressable onPress={onFitSelection} style={styles.iconBtn} accessibilityLabel="Fit selection" hitSlop={6}>
            <Ionicons name="scan-outline" size={18} color={colors.cream} />
          </Pressable>
          <ActionButton icon="arrow-up-circle-outline" label="Front" onPress={onBringForward} />
          <ActionButton icon="arrow-down-circle-outline" label="Back" onPress={onSendBackward} />
          <ActionButton icon="git-branch-outline" label="Unlink" onPress={onRemoveDependency} />
          <Pressable onPress={onCopy} style={styles.iconBtn} accessibilityLabel="Copy selection" hitSlop={6}>
            <Ionicons name="clipboard-outline" size={18} color={colors.cream} />
          </Pressable>
          <Pressable onPress={onPaste} style={[styles.iconBtn, !canPaste && styles.disabled]} disabled={!canPaste} accessibilityLabel="Paste clipboard" hitSlop={6}>
            <Ionicons name="duplicate-outline" size={18} color={colors.cream} />
          </Pressable>
          <Pressable onPress={onLock} style={styles.iconBtn} accessibilityLabel={lockActive ? 'Unlock selection' : 'Lock selection'} hitSlop={6}>
            <Ionicons name={lockActive ? 'lock-open-outline' : 'lock-closed-outline'} size={18} color={colors.cream} />
          </Pressable>
          <Pressable onPress={onDuplicate} style={styles.iconBtn} accessibilityLabel="Duplicate">
            <Ionicons name="copy-outline" size={18} color={colors.cream} />
          </Pressable>
          <Pressable onPress={onDelete} style={styles.iconBtn} accessibilityLabel="Delete" hitSlop={6}>
            <Ionicons name="trash-outline" size={18} color={colors.cream} />
          </Pressable>
          <ActionButton icon="close-outline" label="Deselect" onPress={onDeselect} />
        </View>
      ) : null}
      <View style={[styles.bar, shadows.control]}>
        <Pressable onPress={onZoomOut} style={styles.iconBtn} accessibilityLabel="Zoom out" hitSlop={6}>
          <Ionicons name="remove" size={20} color={colors.cream} />
        </Pressable>
        <Pressable onPress={onResetZoom} style={styles.zoomPct} accessibilityLabel="Reset zoom" hitSlop={6}>
          <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
        </Pressable>
        <Pressable onPress={onZoomIn} style={styles.iconBtn} accessibilityLabel="Zoom in" hitSlop={6}>
          <Ionicons name="add" size={20} color={colors.cream} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable onPress={onFit} style={styles.fitBtn} accessibilityLabel="Fit entire board" onLongPress={onFitSelection} hitSlop={6}>
          <Ionicons name="expand-outline" size={18} color={colors.cream} />
          <Text style={styles.fitText}>Fit board</Text>
        </Pressable>
        {canPaste ? (
          <>
            <View style={styles.divider} />
            <Pressable onPress={onPaste} style={styles.iconBtn} accessibilityLabel="Paste clipboard" hitSlop={6}>
              <Ionicons name="clipboard-outline" size={18} color={colors.cream} />
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn} accessibilityLabel={label} hitSlop={6}>
      <Ionicons name={icon} size={16} color={colors.cream} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
  actionBtn: {
    minWidth: 42,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionLabel: {
    color: 'rgba(255,250,240,0.82)',
    fontSize: 8,
    fontWeight: '800',
    marginTop: -2,
  },
  disabled: {
    opacity: 0.35,
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
