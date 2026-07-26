import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useBoard } from '../store/BoardContext';
import { colors } from '../theme';
import { CanvasItemView } from './CanvasItemView';
import { BoardItem, RegionItem } from '../types';
import { clampScale } from '../lib/camera';
import { haptics } from '../lib/haptics';
import { isTaskBlocked } from '../lib/taskBlocking';
import { computeRegionDepth, sortItemsForRender } from '../lib/regionLayers';

// Below this pointer velocity (px/s) we don't fling — avoids stray momentum from
// releasing a pinch or a deliberate stop.
const MOMENTUM_MIN_VELOCITY = 90;

// Dot grid spacing in world units, and the on-screen tile range worth drawing.
// Outside that range the dots are either too dense to read or so far apart they
// add nothing, so the grid is skipped — which also keeps the drawn surface
// bounded at extreme zoom.
const GRID_SPACING = 28;
const MIN_GRID_TILE = 6;
const MAX_GRID_TILE = 160;

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
    moveItemsCommitWithSnap,
    updateText,
    toggleTask,
    appendDrawingPoint,
    setPanel,
    resizeItem,
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
    const s = clampScale(zoomRequest.scale);
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
      if (commit) {
        // Only snap at drop — a live per-frame version would need continuous
        // guide-line UI to feel intentional rather than jittery.
        moveItemsCommitWithSnap(ids, adx, ady);
        lastMoveCommit.current = { dx: 0, dy: 0 };
        movingIdsRef.current = [];
      } else {
        moveItems(ids, adx, ady, false);
      }
    },
    [moveItems, moveItemsCommitWithSnap],
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
    })
    .onEnd((e) => {
      // Gentle momentum so a flick keeps gliding, then eases to rest. Skip tiny
      // velocities (deliberate stops, pinch releases) so the canvas doesn't drift.
      if (Math.abs(e.velocityX) > MOMENTUM_MIN_VELOCITY) {
        tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.992 });
      }
      if (Math.abs(e.velocityY) > MOMENTUM_MIN_VELOCITY) {
        ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.992 });
      }
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      // Wide-range zoom (0.01x–50x). Keep the world point under the fingers fixed
      // even when the raw pinch would push past a limit: we clamp the scale first,
      // then recompute the translation from that clamped scale so there is no
      // drift or jump at the extremes.
      const next = clampScale(startScale.value * e.scale);
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
    .onTouchesDown((e, state) => {
      if (tool === 'draw' || selectedIds.length === 0) {
        state.fail();
        return;
      }
      // Two-finger navigation always wins: the moment a second finger lands, this
      // item drag yields so pan/pinch take over cleanly.
      if (e.numberOfTouches >= 2) {
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

  // Dot grid.
  //
  // This used to be a single WORLD x WORLD (4000x4000) <Svg> with a tiled
  // <Pattern> — ~16M pixels and ~20k tile repetitions. On Android that
  // exceeds the GPU's maximum texture size and crashes inside react-native-
  // svg's *native* renderer the moment the canvas mounts, which a JS error
  // boundary cannot catch (this was the launch crash).
  //
  // Instead the grid is drawn once at viewport size (plus a one-tile bleed)
  // and lives outside the transformed world. It follows the camera by
  // translating within a single tile — the standard infinite-grid trick — so
  // it still reads as part of the canvas while the drawn surface stays small
  // and bounded no matter how far you pan or zoom.
  const tileSize = GRID_SPACING * scaleState;
  const gridVisible = tileSize >= MIN_GRID_TILE && tileSize <= MAX_GRID_TILE;

  const gridAnimatedStyle = useAnimatedStyle(() => {
    const tile = GRID_SPACING * scale.value;
    if (tile <= 0) return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    // Wrap the offset into [-tile, 0] so one tile of bleed always covers the edge.
    const ox = (tx.value % tile) - tile;
    const oy = (ty.value % tile) - tile;
    return { transform: [{ translateX: ox }, { translateY: oy }] };
  });

  const grid = useMemo(() => {
    if (!gridVisible) return null;
    const w = viewportWidth + tileSize * 2;
    const h = viewportHeight + tileSize * 2;
    const r = Math.max(0.8, 1.2 * scaleState);
    return (
      <Svg width={w} height={h}>
        <Defs>
          <Pattern
            id="dots"
            x="0"
            y="0"
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
          >
            <Circle cx={r} cy={r} r={r} fill={colors.canvasGrid} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#dots)" />
      </Svg>
    );
  }, [gridVisible, tileSize, scaleState, viewportWidth, viewportHeight]);

  const renderItems = useMemo(
    () => sortItemsForRender(currentBoard.items),
    [currentBoard.items],
  );
  const regions = useMemo(
    () => currentBoard.items.filter((it): it is RegionItem => it.type === 'region'),
    [currentBoard.items],
  );

  return (
    <View style={[styles.root, { width: viewportWidth, height: viewportHeight }]}>
      {/* Grid sits behind the world and is translated (never scaled) so its
          drawn surface stays viewport-sized. */}
      {grid ? (
        <Animated.View pointerEvents="none" style={[styles.grid, gridAnimatedStyle]}>
          {grid}
        </Animated.View>
      ) : null}
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.world, animatedStyle]}>
          {renderItems.map((item) => (
            <CanvasItemView
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              editing={editingId === item.id}
              scale={scaleState}
              regionDepth={item.type === 'region' ? computeRegionDepth(item, regions) : 0}
              onSelect={() => {
                if (tool === 'multi') select([item.id], true);
                else select([item.id], false);
                setEditingId(null);
              }}
              onLongPress={() => {
                select([item.id], false);
                if (item.type === 'text' || item.type === 'task' || item.type === 'mindmap') {
                  haptics.light();
                  setEditingId(item.id);
                }
              }}
              onChangeText={(text) => updateText(item.id, text)}
              onToggleTask={() => toggleTask(item.id)}
              onEndEdit={() => setEditingId(null)}
              onResize={(rect, commit) => resizeItem(item.id, rect, commit)}
              blocked={item.type === 'task' && isTaskBlocked(item, currentBoard.items)}
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
  grid: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  world: {
    width: WORLD,
    height: WORLD,
    transformOrigin: '0 0',
  },
});
