import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { useChromeSlot } from '../chrome/ChromeLayoutContext';
import { colors, radii } from '../theme';
import { PanelKind } from '../types';
import { hapticImpact, hapticSelection } from '../lib/haptics';

const COLLAPSED_KEY = 'fieldnote.toolbarCollapsed';
const POSE_KEY = 'fieldnote.toolbarPose';
const RAIL_W = 52;
const COLLAPSED_W = 40;
const EDGE_SNAP = 28;

type ToolBtn = {
  key: string;
  label: string;
  panel?: PanelKind;
  tool?: 'select' | 'draw' | 'multi' | 'lasso';
  icon: React.ReactNode;
};

type Pose = { x: number; y: number };

const softShadow = {
  shadowColor: '#1a120c',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 4,
};

export function Toolbar() {
  const {
    panel,
    setPanel,
    tool,
    setTool,
    clearSelection,
    selectAll,
    undo,
    canUndo,
    selectedIds,
  } = useBoard();
  const { width: winW, height: winH } = useWindowDimensions();
  const [collapsed, setCollapsed] = React.useState(false);
  const [pose, setPose] = React.useState<Pose>({ x: 10, y: 54 });
  const [loaded, setLoaded] = React.useState(false);
  const dragOrigin = React.useRef<Pose>({ x: 10, y: 54 });

  React.useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(COLLAPSED_KEY);
        if (raw === '1' || raw === 'true') setCollapsed(true);
        const poseRaw = await AsyncStorage.getItem(POSE_KEY);
        if (poseRaw) {
          const parsed = JSON.parse(poseRaw) as Pose;
          if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) setPose(parsed);
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persistCollapsed = React.useCallback((next: boolean) => {
    setCollapsed(next);
    void AsyncStorage.setItem(COLLAPSED_KEY, next ? '1' : '0').catch(() => undefined);
  }, []);

  const persistPose = React.useCallback((next: Pose) => {
    setPose(next);
    void AsyncStorage.setItem(POSE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const clampPose = React.useCallback(
    (x: number, y: number): Pose => {
      const w = collapsed ? COLLAPSED_W : RAIL_W;
      const h = collapsed ? COLLAPSED_W : 340;
      let nx = Math.max(6, Math.min(x, winW - w - 6));
      let ny = Math.max(8, Math.min(y, winH - h - 8));
      if (nx < EDGE_SNAP) nx = 10;
      if (nx > winW - w - EDGE_SNAP) nx = winW - w - 10;
      return { x: nx, y: ny };
    },
    [collapsed, winH, winW],
  );

  const applyDrag = React.useCallback(
    (tx: number, ty: number) => {
      const next = clampPose(dragOrigin.current.x + tx, dragOrigin.current.y + ty);
      setPose(next);
    },
    [clampPose],
  );

  const endDrag = React.useCallback(
    (tx: number, ty: number) => {
      const next = clampPose(dragOrigin.current.x + tx, dragOrigin.current.y + ty);
      persistPose(next);
      void hapticSelection();
    },
    [clampPose, persistPose],
  );

  const beginDrag = React.useCallback(() => {
    dragOrigin.current = pose;
  }, [pose]);

  const gripGesture = React.useMemo(    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onBegin(() => {
          'worklet';
          runOnJS(beginDrag)();
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(applyDrag)(e.translationX, e.translationY);
        })
        .onEnd((e) => {
          'worklet';
          runOnJS(endDrag)(e.translationX, e.translationY);
        }),
    [applyDrag, beginDrag, endDrag],
  );

  const preferred = React.useMemo(
    () => ({
      x: pose.x,
      y: pose.y,
      width: collapsed ? COLLAPSED_W : RAIL_W,
      height: collapsed ? COLLAPSED_W : 320,
    }),
    [collapsed, pose.x, pose.y],
  );
  const slot = useChromeSlot('toolbar', preferred, true);
  const left = slot?.left ?? preferred.x;
  const top = slot?.top ?? preferred.y;

  const [tip, setTip] = React.useState<string | null>(null);
  const tipTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTip = React.useCallback((label: string) => {
    setTip(label);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(null), 1800);
  }, []);

  React.useEffect(
    () => () => {
      if (tipTimer.current) clearTimeout(tipTimer.current);
    },
    [],
  );

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
      icon: (
        <MaterialCommunityIcons
          name="checkbox-multiple-marked-outline"
          size={18}
          color={colors.cream}
        />
      ),
    },
    {
      key: 'lasso',
      label: 'Lasso',
      tool: 'lasso',
      icon: <Ionicons name="scan-outline" size={18} color={colors.cream} />,
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

  if (!loaded) return null;

  if (collapsed) {
    return (
      <GestureDetector gesture={gripGesture}>
        <Pressable
          style={[styles.collapsed, softShadow, { left, top }]}
          onPress={() => {
            void hapticSelection();
            persistCollapsed(false);
          }}
          accessibilityLabel="Show canvas tools. Drag grip to move."
        >
          <Ionicons name="chevron-forward" size={18} color={colors.cream} />
        </Pressable>
      </GestureDetector>
    );
  }

  return (
    <View style={[styles.rail, softShadow, { left, top }]}>
      <GestureDetector gesture={gripGesture}>
        <View style={styles.grip} accessibilityLabel="Move toolbar">
          <View style={styles.gripBar} />
          <View style={styles.gripBar} />
          <View style={styles.gripBar} />
        </View>
      </GestureDetector>
      <View style={styles.head}>
        <Pressable
          onPress={() => {
            void hapticSelection();
            persistCollapsed(true);
          }}
          style={styles.headBtn}
          accessibilityLabel="Hide tools"
        >
          <Ionicons name="chevron-back" size={16} color={colors.cream} />
        </Pressable>
      </View>
      {buttons.map((btn) => {
        const active =
          (btn.panel && panel === btn.panel) || (btn.tool && tool === btn.tool);
        const multiCount = btn.key === 'multi' ? selectedIds.length : 0;
        return (
          <Pressable
            key={btn.key}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => {
              void hapticSelection();
              if (btn.panel) {
                setPanel(panel === btn.panel ? null : btn.panel);
                if (btn.panel === 'add') clearSelection();
              } else if (btn.tool) {
                setTool(tool === btn.tool ? 'select' : btn.tool);
                setPanel(null);
              }
            }}
            onLongPress={() => {
              void hapticImpact('medium');
              showTip(btn.label);
              if (btn.key === 'multi') selectAll();
              if (btn.key === 'more' && canUndo) undo();
            }}
            accessibilityLabel={
              btn.key === 'multi' && multiCount > 0
                ? `Multi, ${multiCount} selected`
                : btn.label
            }
            accessibilityHint={
              btn.key === 'multi'
                ? 'Long press to select all cards'
                : btn.key === 'more'
                  ? 'Long press to undo'
                  : `Long press for ${btn.label}`
            }
          >
            <View style={styles.iconWrap}>
              {btn.icon}
              {btn.key === 'multi' && multiCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {multiCount > 99 ? '99+' : String(multiCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      {tip ? (
        <View style={styles.tipBubble} pointerEvents="none">
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    width: RAIL_W,
    backgroundColor: colors.walnut,
    borderRadius: radii.toolbar,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
    zIndex: 40,
  },
  grip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,248,236,0.08)',
  },
  gripBar: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,248,236,0.55)',
  },
  collapsed: {
    position: 'absolute',
    width: COLLAPSED_W,
    height: COLLAPSED_W,
    borderRadius: 14,
    backgroundColor: colors.walnut,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  head: {
    alignItems: 'center',
    marginBottom: 2,
  },
  headBtn: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  btnActive: {
    backgroundColor: 'rgba(203,125,70,0.54)',
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.clayDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.cream,
    fontSize: 9,
    fontWeight: '700',
  },
  tipBubble: {
    position: 'absolute',
    left: RAIL_W + 8,
    top: 48,
    backgroundColor: colors.walnut,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    minWidth: 72,
  },
  tipText: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '600',
  },
});
