import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

const DEPTH_ORDER: Array<number | 'all'> = [1, 2, 3, 4, 'all'];

/** Compact toolbar for a selected mind-map node. */
export function MindMapToolbar() {
  const {
    currentBoard,
    selectedIds,
    addMindMapChild,
    addMindMapSibling,
    tidySelectedMindMap,
    setMindMapDepth,
    mindMapDepth,
    toggleMindMapCollapse,
  } = useBoard();

  const focusId = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const first = currentBoard.items.find((it) => it.id === selectedIds[0]);
    if (first?.type === 'mindmap') return first.id;
    if (selectedIds.length === 1) {
      const only = currentBoard.items.find((it) => it.id === selectedIds[0]);
      return only?.type === 'mindmap' ? only.id : null;
    }
    return null;
  }, [currentBoard.items, selectedIds]);

  if (!focusId) return null;

  const depthLabel = mindMapDepth === 'all' ? 'All' : String(mindMapDepth);

  return (
    <View style={[styles.bar, shadows.control]} pointerEvents="box-none">
      <ToolBtn
        label="Child"
        accessibilityLabel="Add mind-map child"
        onPress={() => {
          void hapticSelection();
          addMindMapChild(focusId);
        }}
        icon={<Ionicons name="git-branch-outline" size={18} color={colors.cream} />}
      />
      <ToolBtn
        label="Sibling"
        accessibilityLabel="Add mind-map sibling"
        onPress={() => {
          void hapticSelection();
          addMindMapSibling(focusId);
        }}
        icon={<MaterialCommunityIcons name="relation-many-to-many" size={18} color={colors.cream} />}
      />
      <ToolBtn
        label="Tidy"
        accessibilityLabel="Tidy mind map"
        onPress={() => {
          void hapticSelection();
          tidySelectedMindMap();
        }}
        icon={<Ionicons name="git-network-outline" size={18} color={colors.cream} />}
      />
      <ToolBtn
        label={depthLabel}
        accessibilityLabel={`Mind-map depth ${depthLabel}`}
        onPress={() => {
          void hapticSelection();
          const idx = DEPTH_ORDER.indexOf(mindMapDepth);
          setMindMapDepth(DEPTH_ORDER[(idx + 1) % DEPTH_ORDER.length]);
        }}
        icon={<Ionicons name="layers-outline" size={18} color={colors.cream} />}
      />
      <ToolBtn
        label="Collapse"
        accessibilityLabel="Collapse or expand mind-map branch"
        onPress={() => {
          void hapticSelection();
          toggleMindMapCollapse(focusId);
        }}
        icon={<MaterialCommunityIcons name="arrow-collapse-vertical" size={18} color={colors.cream} />}
      />
    </View>
  );
}

function ToolBtn({
  label,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      style={styles.btn}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
    >
      {icon}
      <Text style={styles.btnLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.toolbar,
    backgroundColor: 'rgba(31, 24, 19, 0.78)',
  },
  btn: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 10,
  },
  btnLabel: {
    color: 'rgba(255,248,233,0.88)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
