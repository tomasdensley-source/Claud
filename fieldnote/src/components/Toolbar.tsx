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
  const { panel, setPanel, tool, setTool, clearSelection, selectAll, undo, canUndo } = useBoard();
  const [collapsed, setCollapsed] = React.useState(false);

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
        style={[styles.collapsed, shadows.control]}
        onPress={() => setCollapsed(false)}
        accessibilityLabel="Show canvas tools"
      >
        <Ionicons name="chevron-forward" size={18} color={colors.cream} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.rail, shadows.control]}>
      <View style={styles.head}>
        <Pressable onPress={() => setCollapsed(true)} style={styles.headBtn} accessibilityLabel="Hide tools">
          <Ionicons name="chevron-back" size={16} color={colors.cream} />
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
            onLongPress={() => {
              if (btn.key === 'multi') selectAll();
              if (btn.key === 'more' && canUndo) undo();
            }}
            accessibilityLabel={btn.label}
            accessibilityHint={
              btn.key === 'multi'
                ? 'Long press to select all cards'
                : btn.key === 'more'
                  ? 'Long press to undo'
                  : undefined
            }
          >
            {btn.icon}
            <Text style={styles.label} numberOfLines={1}>
              {btn.label}
            </Text>
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
  label: {
    color: 'rgba(255,250,240,0.82)',
    fontSize: 8,
    fontWeight: '700',
    maxWidth: 48,
  },
});
