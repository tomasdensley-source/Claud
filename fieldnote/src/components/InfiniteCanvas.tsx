import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useBoard } from '../store/BoardContext';
import { colors } from '../theme';
import { CanvasItemView } from './CanvasItemView';
import { BoardItem } from '../types';

// Item drag is handled via selected-item pan gesture below.

const WORLD = 4000;

interface Props {
  viewportWidth: number;
  viewportHeight: number;
  onScaleChange: (scale: number) => void;
  fitRequest: number;
  zoomRequest: { scale: number; token: number } | null;
  centerRequest: { x: number; y: number; token: number } | null;
}

function boundsOf(items: BoardItem[]) {
  if (items.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  items.forEach((it) => {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.width);
    maxY = Math.max(maxY, it.y + it.height);
  });
  return { minX, minY, maxX, maxY };
}

export function InfiniteCanvas({
  viewportWidth,
  viewportHeight,
  onScaleChange,
  fitRequest,
  zoomRequest,
  centerRequest,
}: Props) {
  const {
    currentBoard,
    selectedIds,
    tool,
    select,
    clearSelection,
    moveItems,
    updateText,
    toggleTask,
    appendDrawingPoint,
    setPanel,
  } = useBoard();

  const scale = useSharedValue(0.86);
  const tx = useSharedValue(24);
  const ty = useSharedValue(40);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const dragStart = useSharedValue({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scaleState, setScaleState] = useState(0.86);
  const drawingIdRef = useRef<string | null>(null);
  const lastMoveCommit = useRef({ dx: 0, dy: 0 });
  const movingIdsRef = useRef<string[]>([]);

  const reportScale = useCallback(
    (s: number) => {
      setScaleState(s);
      onScaleChange(s);
    },
    [onScaleChange],
  );

  const applyTransform = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      scale.value = nextScale;
      tx.value = nextTx;
      ty.value = nextTy;
      reportScale(nextScale);
    },
    [reportScale, scale, tx, ty],
  );

  const fitBoard = useCallback(() => {
    const b = boundsOf(currentBoard.items);
    const pad = 80;
    const w = Math.max(200, b.maxX - b.minX + pad * 2);
    const h = Math.max(200, b.maxY - b.minY + pad * 2);
    const s = Math.min(viewportWidth / w, viewportHeight / h, 1.4);
    const nextTx = viewportWidth / 2 - ((b.minX + b.maxX) / 2) * s;
    const nextTy = viewportHeight / 2 - ((b.minY + b.maxY) / 2) * s;
    applyTransform(s, nextTx, nextTy);
  }, [applyTransform, currentBoard.items, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (fitRequest > 0) fitBoard();
  }, [fitRequest, fitBoard]);

  useEffect(() => {
    if (!zoomRequest) return;
    const cx = (viewportWidth / 2 - tx.value) / scale.value;
    const cy = (viewportHeight / 2 - ty.value) / scale.value;
    const s = zoomRequest.scale;
    applyTransform(s, viewportWidth / 2 - cx * s, viewportHeight / 2 - cy * s);
  }, [zoomRequest, applyTransform, scale, tx, ty, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (!centerRequest) return;
    const s = scale.value;
    applyTransform(
      s,
      viewportWidth / 2 - centerRequest.x * s,
      viewportHeight / 2 - centerRequest.y * s,
    );
  }, [centerRequest, applyTransform, scale, viewportHeight, viewportWidth]);

  useEffect(() => {
    // Initial fit once dimensions known
    fitBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, viewportHeight]);

  const screenToWorld = useCallback(
    (x: number, y: number) => ({
      x: (x - tx.value) / scale.value,
      y: (y - ty.value) / scale.value,
    }),
    [scale, tx, ty],
  );

  const onCanvasTap = useCallback(
    (x: number, y: number) => {
      if (tool === 'draw') return;
      clearSelection();
      setEditingId(null);
    },
    [clearSelection, tool],
  );

  const onCanvasLongPress = useCallback(
    (x: number, y: number) => {
      setPanel('add');
    },
    [setPanel],
  );

  const beginItemDrag = useCallback(
    (ids: string[]) => {
      movingIdsRef.current = ids;
      lastMoveCommit.current = { dx: 0, dy: 0 };
    },
    [],
  );

  const applyItemDrag = useCallback(
    (dx: number, dy: number, commit: boolean) => {
      const ids = movingIdsRef.current;
      if (!ids.length) return;
      const adx = dx - lastMoveCommit.current.dx;
      const ady = dy - lastMoveCommit.current.dy;
      lastMoveCommit.current = { dx, dy };
      if (adx === 0 && ady === 0 && !commit) return;
      moveItems(ids, adx, ady, commit);
      if (commit) {
        lastMoveCommit.current = { dx: 0, dy: 0 };
        movingIdsRef.current = [];
      }
    },
    [moveItems],
  );

  const drawAt = useCallback(
    (x: number, y: number, start: boolean) => {
      const world = screenToWorld(x, y);
      if (start) drawingIdRef.current = null;
      const id = appendDrawingPoint(drawingIdRef.current, world, start);
      drawingIdRef.current = id;
    },
    [appendDrawingPoint, screenToWorld],
  );

  const panGesture = Gesture.Pan()
    .minPointers(tool === 'draw' ? 2 : 1)
    .maxPointers(2)
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = Math.min(2.5, Math.max(0.25, startScale.value * e.scale));
      const focalX = e.focalX;
      const focalY = e.focalY;
      const worldX = (focalX - startTx.value) / startScale.value;
      const worldY = (focalY - startTy.value) / startScale.value;
      scale.value = next;
      tx.value = focalX - worldX * next;
      ty.value = focalY - worldY * next;
    })
    .onEnd(() => {
      runOnJS(reportScale)(scale.value);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(onCanvasTap)(e.x, e.y);
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(450)
    .onEnd((e, success) => {
      if (success) runOnJS(onCanvasLongPress)(e.x, e.y);
    });

  const drawGesture = Gesture.Pan()
    .enabled(tool === 'draw')
    .maxPointers(1)
    .onBegin((e) => {
      runOnJS(drawAt)(e.x, e.y, true);
    })
    .onUpdate((e) => {
      runOnJS(drawAt)(e.x, e.y, false);
    });

  const itemPanGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((_e, state) => {
      if (tool === 'draw' || selectedIds.length === 0) {
        state.fail();
        return;
      }
      state.activate();
    })
    .onBegin(() => {
      runOnJS(beginItemDrag)(selectedIds);
      dragStart.value = { x: 0, y: 0 };
    })
    .onUpdate((e) => {
      const dx = e.translationX / scale.value;
      const dy = e.translationY / scale.value;
      runOnJS(applyItemDrag)(dx, dy, false);
    })
    .onEnd((e) => {
      const dx = e.translationX / scale.value;
      const dy = e.translationY / scale.value;
      runOnJS(applyItemDrag)(dx, dy, true);
    });

  const composed = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(drawGesture, itemPanGesture, panGesture),
    Gesture.Exclusive(longPressGesture, tapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const grid = useMemo(() => {
    const size = 28;
    return (
      <Svg width={WORLD} height={WORLD} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="dots" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={1.2} fill={colors.canvasGrid} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width={WORLD} height={WORLD} fill="url(#dots)" />
      </Svg>
    );
  }, []);

  return (
    <View style={[styles.root, { width: viewportWidth, height: viewportHeight }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.world, animatedStyle]}>
          {grid}
          {currentBoard.items.map((item) => (
            <CanvasItemView
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              editing={editingId === item.id}
              scale={scaleState}
              onSelect={() => {
                if (tool === 'multi') select([item.id], true);
                else select([item.id], false);
                setEditingId(null);
              }}
              onLongPress={() => {
                select([item.id], false);
                if (item.type === 'text' || item.type === 'task' || item.type === 'mindmap') {
                  setEditingId(item.id);
                }
              }}
              onChangeText={(text) => updateText(item.id, text)}
              onToggleTask={() => toggleTask(item.id)}
              onEndEdit={() => setEditingId(null)}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function useViewportSize() {
  const [size, setSize] = useState(Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setSize(window));
    return () => sub.remove();
  }, []);
  return size;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  world: {
    width: WORLD,
    height: WORLD,
    transformOrigin: '0 0',
  },
});
