import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';
import { PanelKind } from '../types';

type ToolBtn = {
  key: string;
  label: string;
  panel?: PanelKind;
  tool?: 'select' | 'draw' | 'multi';
  icon: React.ReactNode;
};

export function Toolbar() {
  const { panel, setPanel, tool, setTool, clearSelection, selectedIds } = useBoard();
  const [collapsed, setCollapsed] = React.useState(false);
  const [side, setSide] = React.useState<'left' | 'right'>('left');

  const buttons: ToolBtn[] = [
    {
      key: 'add',
      label: 'Add',
      panel: 'add',
      icon: <Ionicons name="sparkles-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'boards',
      label: 'Boards',
      panel: 'boards',
      icon: <Ionicons name="grid-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'files',
      label: 'Files',
      panel: 'files',
      icon: <Ionicons name="folder-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'multi',
      label: 'Multi',
      tool: 'multi',
      icon: <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'draw',
      label: 'Draw',
      tool: 'draw',
      icon: <Ionicons name="pencil-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'search',
      label: 'Find',
      panel: 'search',
      icon: <Ionicons name="search-outline" size={18} color={colors.cream} />,
    },
    {
      key: 'more',
      label: 'More',
      panel: 'more',
      icon: <Ionicons name="ellipsis-vertical" size={18} color={colors.cream} />,
    },
  ];

  if (collapsed) {
    return (
      <Pressable
        style={[styles.collapsed, side === 'right' && styles.rightCollapsed, shadows.control]}
        onPress={() => setCollapsed(false)}
        onLongPress={() => setSide(side === 'left' ? 'right' : 'left')}
        accessibilityLabel="Show canvas tools"
        hitSlop={8}
      >
        <Ionicons name={side === 'left' ? 'chevron-forward' : 'chevron-back'} size={18} color={colors.cream} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.rail, side === 'right' && styles.railRight, shadows.control]}>
      <View style={styles.head}>
        <Pressable
          onPress={() => setCollapsed(true)}
          onLongPress={() => setSide(side === 'left' ? 'right' : 'left')}
          style={styles.headBtn}
          accessibilityLabel="Hide tools"
          hitSlop={10}
        >
          <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.cream} />
        </Pressable>
      </View>
      {buttons.map((btn) => {
        const active =
          (btn.panel && panel === btn.panel) ||
          (btn.tool && tool === btn.tool);
        return (
          <Pressable
            key={btn.key}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => {
              if (btn.panel) {
                setPanel(panel === btn.panel ? null : btn.panel);
                if (btn.panel === 'add') clearSelection();
              } else if (btn.tool) {
                setTool(tool === btn.tool ? 'select' : btn.tool);
                setPanel(null);
              }
            }}
            accessibilityLabel={btn.label}
            hitSlop={6}
          >
            {btn.icon}
            <Text style={styles.label} numberOfLines={1}>
              {btn.label}
            </Text>
            {btn.key === 'multi' && selectedIds.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{selectedIds.length}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 10,
    top: 54,
    width: 58,
    backgroundColor: colors.walnut,
    borderRadius: radii.toolbar,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
    zIndex: 40,
  },
  railRight: {
    left: undefined,
    right: 10,
  },
  collapsed: {
    position: 'absolute',
    left: 10,
    top: 54,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.walnut,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  rightCollapsed: {
    left: undefined,
    right: 10,
  },
  head: {
    alignItems: 'center',
    marginBottom: 4,
  },
  headBtn: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  btnActive: {
    backgroundColor: 'rgba(203,125,70,0.54)',
  },
  countBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.selection,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: colors.walnut,
    fontSize: 10,
    fontWeight: '900',
  },
  label: {
    color: 'rgba(255,250,240,0.82)',
    fontSize: 8,
    fontWeight: '700',
    maxWidth: 48,
  },
});
