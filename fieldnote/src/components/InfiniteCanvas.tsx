import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useBoard } from '../store/BoardContext';
import { colors } from '../theme';
import { CanvasItemView } from './CanvasItemView';
import { BoardItem } from '../types';
import { clampInertiaVelocity } from '../lib/placement';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.8;
const CULL_PAD = 420;
const GRID_STEP = 180;
const DRAG_THRESHOLD = 8;
type ConnectorSide = 'left' | 'right' | 'top' | 'bottom';

interface Props {
  viewportWidth: number;
  viewportHeight: number;
  onScaleChange: (scale: number) => void;
  onCameraChange?: (center: { x: number; y: number }) => void;
  fitRequest: number;
  fitSelectionRequest: number;
  editRequest: number;
  zoomRequest: { scale: number; token: number } | null;
  centerRequest: { x: number; y: number; scale?: number; token: number } | null;
  onOpenAddAt?: (center: { x: number; y: number }) => void;
}

function boundsOf(items: BoardItem[]) {
  if (items.length === 0) return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.width);
    maxY = Math.max(maxY, it.y + it.height);
  }
  return { minX, minY, maxX, maxY };
}

function intersects(item: BoardItem, rect: { minX: number; minY: number; maxX: number; maxY: number }) {
  return item.x + item.width >= rect.minX && item.x <= rect.maxX && item.y + item.height >= rect.minY && item.y <= rect.maxY;
}

function centerOf(item: BoardItem) {
  return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
}

function sidePoint(item: BoardItem, side: ConnectorSide) {
  if (side === 'left') return { x: item.x, y: item.y + item.height / 2 };
  if (side === 'right') return { x: item.x + item.width, y: item.y + item.height / 2 };
  if (side === 'top') return { x: item.x + item.width / 2, y: item.y };
  return { x: item.x + item.width / 2, y: item.y + item.height };
}

function offsetSidePoint(item: BoardItem, side: ConnectorSide, offset = 12) {
  const point = sidePoint(item, side);
  if (side === 'left') return { x: point.x - offset, y: point.y };
  if (side === 'right') return { x: point.x + offset, y: point.y };
  if (side === 'top') return { x: point.x, y: point.y - offset };
  return { x: point.x, y: point.y + offset };
}

export function InfiniteCanvas({
  viewportWidth,
  viewportHeight,
  onScaleChange,
  onCameraChange,
  fitRequest,
  fitSelectionRequest,
  editRequest,
  zoomRequest,
  centerRequest,
  onOpenAddAt,
}: Props) {
  const {
    currentBoard,
    selectedIds,
    visibleItems,
    tool,
    select,
    clearSelection,
    moveItems,
    resizeItem,
    updateText,
    commitTextEdit,
    toggleTask,
    appendDrawingPoint,
    setPanel,
    completeConnect,
    cancelConnect,
    connectingFromId,
    addMindChild,
    addMindSibling,
    toggleMindCollapse,
    tidyMindMap,
    openUri,
  } = useBoard();

  const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 360;
  const safeHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 640;
  const scale = useSharedValue(0.7);
  const tx = useSharedValue(16);
  const ty = useSharedValue(48);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [scaleState, setScaleState] = useState(0.7);
  const [txState, setTxState] = useState(16);
  const [tyState, setTyState] = useState(48);
  const [marquee, setMarquee] = useState<null | { x: number; y: number; width: number; height: number }>(null);

  const drawingIdRef = useRef<string | null>(null);
  const toolRef = useRef(tool);
  const selectedRef = useRef(selectedIds);
  const scaleRef = useRef(scaleState);
  const txRef = useRef(txState);
  const tyRef = useRef(tyState);
  const dragIdsRef = useRef<string[]>([]);
  const dragActiveRef = useRef(false);
  const resizeRef = useRef<null | { id: string; width: number; height: number; pageX: number; pageY: number }>(null);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastPageRef = useRef({ x: 0, y: 0 });
  const itemTouchStartRef = useRef({ id: '', pageX: 0, pageY: 0 });
  const marqueeStartRef = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 });
  toolRef.current = tool;
  selectedRef.current = selectedIds;
  scaleRef.current = scaleState;
  txRef.current = txState;
  tyRef.current = tyState;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const reportTransform = useCallback(
    (s: number, x: number, y: number) => {
      if (!Number.isFinite(s) || !Number.isFinite(x) || !Number.isFinite(y)) return;
      setScaleState(s);
      setTxState(x);
      setTyState(y);
      onScaleChange(s);
      onCameraChange?.({ x: (safeWidth / 2 - x) / s, y: (safeHeight / 2 - y) / s });
    },
    [onCameraChange, onScaleChange, safeHeight, safeWidth],
  );

  const applyTransform = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
      if (!Number.isFinite(s) || !Number.isFinite(nextTx) || !Number.isFinite(nextTy)) return;
      scale.value = withTiming(s, { duration: 180 });
      tx.value = withTiming(nextTx, { duration: 180 });
      ty.value = withTiming(nextTy, { duration: 180 });
      reportTransform(s, nextTx, nextTy);
    },
    [reportTransform, scale, tx, ty],
  );

  const fitItems = useCallback(
    (items: BoardItem[]) => {
      if (safeWidth < 32 || safeHeight < 32) return;
      const b = boundsOf(items);
      const pad = 140;
      const w = Math.max(240, b.maxX - b.minX + pad * 2);
      const h = Math.max(240, b.maxY - b.minY + pad * 2);
      const s = Math.min(safeWidth / w, safeHeight / h, 1.2);
      if (!Number.isFinite(s) || s <= 0) return;
      applyTransform(
        s,
        safeWidth / 2 - ((b.minX + b.maxX) / 2) * s,
        safeHeight / 2 - ((b.minY + b.maxY) / 2) * s,
      );
    },
    [applyTransform, safeHeight, safeWidth],
  );

  useEffect(() => {
    if (fitRequest > 0) fitItems(currentBoard.items);
  }, [fitRequest, fitItems, currentBoard.items]);

  useEffect(() => {
    if (fitSelectionRequest <= 0) return;
    const selection = currentBoard.items.filter((it) => selectedIds.includes(it.id));
    fitItems(selection.length ? selection : currentBoard.items);
  }, [fitSelectionRequest, fitItems, currentBoard.items, selectedIds]);

  useEffect(() => {
    if (!zoomRequest) return;
    const cx = (safeWidth / 2 - tx.value) / scale.value;
    const cy = (safeHeight / 2 - ty.value) / scale.value;
    applyTransform(zoomRequest.scale, safeWidth / 2 - cx * zoomRequest.scale, safeHeight / 2 - cy * zoomRequest.scale);
  }, [zoomRequest, applyTransform, scale, tx, ty, safeHeight, safeWidth]);

  useEffect(() => {
    if (!centerRequest) return;
    const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, centerRequest.scale ?? scale.value));
    applyTransform(s, safeWidth / 2 - centerRequest.x * s, safeHeight / 2 - centerRequest.y * s);
  }, [centerRequest, applyTransform, scale, safeHeight, safeWidth]);

  useEffect(() => {
    if (editRequest <= 0) return;
    const target = currentBoard.items.find((item) => selectedIds.includes(item.id) && (item.type === 'text' || item.type === 'task' || item.type === 'mindmap'));
    if (target && !target.locked) setEditingId(target.id);
  }, [currentBoard.items, editRequest, selectedIds]);

  const lastBoardIdRef = useRef(currentBoard.id);
  useEffect(() => {
    if (lastBoardIdRef.current === currentBoard.id) return;
    lastBoardIdRef.current = currentBoard.id;
    const b = boundsOf(currentBoard.items);
    const center = { x: (safeWidth / 2 - txRef.current) / scaleRef.current, y: (safeHeight / 2 - tyRef.current) / scaleRef.current };
    const offscreen = center.x < b.minX - 500 || center.x > b.maxX + 500 || center.y < b.minY - 500 || center.y > b.maxY + 500;
    if (offscreen || currentBoard.items.length === 0) fitItems(currentBoard.items);
  }, [currentBoard.id, currentBoard.items, fitItems, safeHeight, safeWidth]);

  const viewportRect = useMemo(
    () => ({
      minX: (-txState - CULL_PAD) / scaleState,
      minY: (-tyState - CULL_PAD) / scaleState,
      maxX: (safeWidth - txState + CULL_PAD) / scaleState,
      maxY: (safeHeight - tyState + CULL_PAD) / scaleState,
    }),
    [safeHeight, safeWidth, scaleState, txState, tyState],
  );

  const culledItems = useMemo(
    () => visibleItems.filter((item) => intersects(item, viewportRect)),
    [visibleItems, viewportRect],
  );

  const gridDots = useMemo(() => {
    const dots: { id: string; x: number; y: number }[] = [];
    const startX = Math.floor(viewportRect.minX / GRID_STEP) * GRID_STEP;
    const endX = Math.ceil(viewportRect.maxX / GRID_STEP) * GRID_STEP;
    const startY = Math.floor(viewportRect.minY / GRID_STEP) * GRID_STEP;
    const endY = Math.ceil(viewportRect.maxY / GRID_STEP) * GRID_STEP;
    for (let x = startX; x <= endX; x += GRID_STEP) {
      for (let y = startY; y <= endY; y += GRID_STEP) {
        dots.push({ id: `${x}:${y}`, x, y });
      }
    }
    return dots.slice(0, 900);
  }, [viewportRect]);

  const clearSel = useCallback(() => {
    if (toolRef.current === 'draw') return;
    clearSelection();
    setEditingId(null);
  }, [clearSelection]);

  const worldPoint = useCallback(
    (x: number, y: number) => ({
      x: (x - txRef.current) / scaleRef.current,
      y: (y - tyRef.current) / scaleRef.current,
    }),
    [],
  );

  const openAdd = useCallback((x?: number, y?: number) => {
    if (typeof x === 'number' && typeof y === 'number') onOpenAddAt?.(worldPoint(x, y));
    else setPanel('add');
  }, [onOpenAddAt, setPanel, worldPoint]);

  const drawAt = useCallback(
    (x: number, y: number, start: boolean) => {
      const world = worldPoint(x, y);
      if (start) drawingIdRef.current = null;
      const previous = lastDrawPointRef.current;
      if (!start && previous) {
        const distance = Math.hypot(world.x - previous.x, world.y - previous.y);
        const steps = Math.min(8, Math.max(1, Math.ceil(distance / 10)));
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          drawingIdRef.current = appendDrawingPoint(
            drawingIdRef.current,
            { x: previous.x + (world.x - previous.x) * t, y: previous.y + (world.y - previous.y) * t },
            false,
          );
        }
      } else {
        drawingIdRef.current = appendDrawingPoint(drawingIdRef.current, world, start);
      }
      lastDrawPointRef.current = world;
    },
    [appendDrawingPoint, worldPoint],
  );

  const reportFrame = useSharedValue(0);
  useAnimatedReaction(
    () => ({ s: scale.value, x: tx.value, y: ty.value }),
    (next, prev) => {
      if (prev && next.s === prev.s && next.x === prev.x && next.y === prev.y) return;
      reportFrame.value = (reportFrame.value + 1) % 3;
      if (!prev || reportFrame.value === 0) runOnJS(reportTransform)(next.s, next.x, next.y);
    },
    [reportTransform],
  );

  const finishDrawing = useCallback(() => {
    drawingIdRef.current = null;
    lastDrawPointRef.current = null;
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(tool === 'draw' ? 2 : 1)
        .maxPointers(2)
        .onBegin(() => {
          'worklet';
          savedTx.value = tx.value;
          savedTy.value = ty.value;
        })
        .onUpdate((e) => {
          'worklet';
          tx.value = savedTx.value + e.translationX;
          ty.value = savedTy.value + e.translationY;
        })
        .onEnd((e) => {
          'worklet';
          tx.value = withDecay({ velocity: clampInertiaVelocity(e.velocityX, scale.value), deceleration: 0.994 });
          ty.value = withDecay({ velocity: clampInertiaVelocity(e.velocityY, scale.value), deceleration: 0.994 });
          runOnJS(reportTransform)(scale.value, tx.value, ty.value);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(reportTransform)(scale.value, tx.value, ty.value);
        }),
    [reportTransform, savedTx, savedTy, scale, tool, tx, ty],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          'worklet';
          savedScale.value = scale.value;
          savedTx.value = tx.value;
          savedTy.value = ty.value;
        })
        .onUpdate((e) => {
          'worklet';
          const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedScale.value * e.scale));
          const worldX = (e.focalX - savedTx.value) / savedScale.value;
          const worldY = (e.focalY - savedTy.value) / savedScale.value;
          scale.value = next;
          tx.value = e.focalX - worldX * next;
          ty.value = e.focalY - worldY * next;
        })
        .onEnd(() => {
          'worklet';
          runOnJS(reportTransform)(scale.value, tx.value, ty.value);
        }),
    [reportTransform, savedScale, savedTx, savedTy, scale, tx, ty],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        'worklet';
        runOnJS(clearSel)();
      }),
    [clearSel],
  );

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((e) => {
          'worklet';
          runOnJS(openAdd)(e.x, e.y);
        }),
    [openAdd],
  );

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onBegin((e) => {
          'worklet';
          runOnJS(drawAt)(e.x, e.y, true);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(drawAt)(e.x, e.y, false);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(finishDrawing)();
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(finishDrawing)();
        }),
    [drawAt, finishDrawing],
  );

  const beginMarquee = useCallback((x: number, y: number) => {
    const world = worldPoint(x, y);
    marqueeStartRef.current = { x, y, worldX: world.x, worldY: world.y };
    setMarquee({ x, y, width: 1, height: 1 });
  }, [worldPoint]);

  const updateMarquee = useCallback((x: number, y: number) => {
    const start = marqueeStartRef.current;
    setMarquee({
      x: Math.min(start.x, x),
      y: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    });
  }, []);

  const endMarquee = useCallback((x: number, y: number) => {
    const start = marqueeStartRef.current;
    const end = worldPoint(x, y);
    const rect = {
      minX: Math.min(start.worldX, end.x),
      minY: Math.min(start.worldY, end.y),
      maxX: Math.max(start.worldX, end.x),
      maxY: Math.max(start.worldY, end.y),
    };
    const ids = visibleItems.filter((item) => intersects(item, rect)).map((item) => item.id);
    if (ids.length) select(ids, true);
    setMarquee(null);
  }, [select, visibleItems, worldPoint]);

  const marqueeGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(8)
        .maxPointers(1)
        .enabled(tool === 'multi')
        .onBegin((e) => {
          'worklet';
          runOnJS(beginMarquee)(e.x, e.y);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(updateMarquee)(e.x, e.y);
        })
        .onEnd((e) => {
          'worklet';
          runOnJS(endMarquee)(e.x, e.y);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(setMarquee)(null);
        }),
    [beginMarquee, endMarquee, tool, updateMarquee],
  );

  const composed = useMemo(() => {
    if (tool === 'draw') return Gesture.Simultaneous(pinchGesture, Gesture.Exclusive(drawGesture, panGesture));
    return Gesture.Simultaneous(
      pinchGesture,
      Gesture.Exclusive(marqueeGesture, panGesture),
      Gesture.Exclusive(doubleTapGesture, tapGesture),
    );
  }, [tool, pinchGesture, marqueeGesture, panGesture, doubleTapGesture, tapGesture, drawGesture]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const startItemDrag = useCallback(
    (item: BoardItem, pageX: number, pageY: number) => {
      if (item.locked || toolRef.current === 'draw') {
        dragIdsRef.current = [];
        dragActiveRef.current = false;
        return;
      }
      if (item.type === 'region' && !selectedRef.current.includes(item.id)) {
        select([item.id], toolRef.current === 'multi');
        dragIdsRef.current = [];
        dragActiveRef.current = false;
        return;
      }
      const selected = selectedRef.current.includes(item.id) ? selectedRef.current : [item.id];
      dragIdsRef.current = selected;
      dragActiveRef.current = true;
      lastPageRef.current = { x: pageX, y: pageY };
      if (toolRef.current === 'multi') select([item.id], true);
      else if (!selectedRef.current.includes(item.id)) select([item.id], false);
      setEditingId(null);
    },
    [select],
  );

  const moveItemDrag = useCallback(
    (pageX: number, pageY: number) => {
      if (dragIdsRef.current.length === 0 || !dragActiveRef.current) return;
      const s = scaleRef.current || 1;
      const dx = (pageX - lastPageRef.current.x) / s;
      const dy = (pageY - lastPageRef.current.y) / s;
      lastPageRef.current = { x: pageX, y: pageY };
      if (dx === 0 && dy === 0) return;
      moveItems(dragIdsRef.current, dx, dy, false);
    },
    [moveItems],
  );

  const endItemDrag = useCallback(() => {
    if (dragIdsRef.current.length && dragActiveRef.current) moveItems(dragIdsRef.current, 0, 0, true);
    dragIdsRef.current = [];
    dragActiveRef.current = false;
  }, [moveItems]);

  const startResize = useCallback((item: BoardItem, pageX: number, pageY: number) => {
    if (item.locked) return;
    resizeRef.current = { id: item.id, width: item.width, height: item.height, pageX, pageY };
    dragIdsRef.current = [];
    dragActiveRef.current = false;
  }, []);

  const moveResize = useCallback((pageX: number, pageY: number) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const s = scaleRef.current || 1;
    const width = resize.width + (pageX - resize.pageX) / s;
    const height = resize.height + (pageY - resize.pageY) / s;
    resizeItem(resize.id, width, height, false);
  }, [resizeItem]);

  const endResize = useCallback((pageX: number, pageY: number) => {
    const resize = resizeRef.current;
    if (!resize) return;
    const s = scaleRef.current || 1;
    resizeItem(resize.id, resize.width + (pageX - resize.pageX) / s, resize.height + (pageY - resize.pageY) / s, true);
    resizeRef.current = null;
  }, [resizeItem]);

  const connectors = useMemo(() => {
    const itemsById = new Map(visibleItems.map((item) => [item.id, item]));
    const views: React.ReactNode[] = [];
    const lineVisible = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const rect = {
        minX: Math.min(from.x, to.x),
        minY: Math.min(from.y, to.y),
        maxX: Math.max(from.x, to.x),
        maxY: Math.max(from.y, to.y),
      };
      return rect.maxX >= viewportRect.minX && rect.minX <= viewportRect.maxX && rect.maxY >= viewportRect.minY && rect.minY <= viewportRect.maxY;
    };
    visibleItems.forEach((item) => {
      if (item.type === 'task') {
        item.dependsOn.forEach((depId) => {
          const dep = itemsById.get(depId);
          if (!dep) return;
          const sides = item.connectorSides?.[depId] ?? { fromSide: 'right' as const, toSide: 'left' as const };
          const from = offsetSidePoint(dep, sides.fromSide);
          const to = offsetSidePoint(item, sides.toSide);
          if (!lineVisible(from, to)) return;
          const x = Math.min(from.x, to.x) - 24;
          const y = Math.min(from.y, to.y) - 24;
          const w = Math.abs(to.x - from.x) + 48;
          const h = Math.abs(to.y - from.y) + 48;
          const done = dep.type === 'task' && dep.done;
          const midX = from.x + (to.x - from.x) / 2;
          const angle = Math.atan2(0, to.x - midX);
          const arrow = `M ${to.x - x} ${to.y - y} L ${to.x - x - Math.cos(angle - 0.45) * 12} ${to.y - y - Math.sin(angle - 0.45) * 12} L ${to.x - x - Math.cos(angle + 0.45) * 12} ${to.y - y - Math.sin(angle + 0.45) * 12} Z`;
          views.push(
            <Svg key={`${depId}-${item.id}`} pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w, height: h, zIndex: 1 }}>
              <Path
                d={`M ${from.x - x} ${from.y - y} L ${midX - x} ${from.y - y} L ${midX - x} ${to.y - y} L ${to.x - x} ${to.y - y}`}
                stroke={done ? colors.success : colors.connector}
                strokeWidth={done ? 4 : 2}
                strokeOpacity={done ? 0.9 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Path d={arrow} fill={done ? colors.success : colors.connector} />
            </Svg>,
          );
        });
      }
      if (item.type === 'mindmap' && item.parentId) {
        const parent = itemsById.get(item.parentId);
        if (!parent) return;
        const from = centerOf(parent);
        const to = centerOf(item);
        if (!lineVisible(from, to)) return;
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y) - 30;
        const w = Math.abs(to.x - from.x) || 1;
        const h = Math.abs(to.y - from.y) + 60;
        const c1x = from.x - x + (to.x - from.x) * 0.42;
        const c2x = from.x - x + (to.x - from.x) * 0.58;
        views.push(
          <Svg key={`${item.parentId}-${item.id}`} pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w, height: h, zIndex: 1 }}>
            <Path
              d={`M ${from.x - x} ${from.y - y} C ${c1x} ${from.y - y}, ${c2x} ${to.y - y}, ${to.x - x} ${to.y - y}`}
              stroke={item.branchColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>,
        );
      }
    });
    return views;
  }, [visibleItems, viewportRect]);

  return (
    <View style={[styles.root, { width: safeWidth, height: safeHeight }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.gestureLayer, { width: safeWidth, height: safeHeight }]} collapsable={false}>
          <Animated.View style={[styles.world, animatedStyle]} collapsable={false}>
            {gridDots.map((dot) => <View key={dot.id} style={[styles.dot, { left: dot.x, top: dot.y }]} />)}
            {connectors}
            {culledItems.map((item) => (
              <View
                key={item.id}
                pointerEvents={item.type === 'drawing' && !selectedSet.has(item.id) ? 'box-none' : 'auto'}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  zIndex: item.zIndex + (selectedSet.has(item.id) ? 1000 : 0),
                }}
                onStartShouldSetResponder={() => false}
                onStartShouldSetResponderCapture={(e) => {
                  itemTouchStartRef.current = { id: item.id, pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY };
                  return false;
                }}
                onMoveShouldSetResponder={(e) => {
                  const start = itemTouchStartRef.current;
                  const touches = 'touches' in e.nativeEvent ? e.nativeEvent.touches?.length ?? 1 : 1;
                  return (
                    toolRef.current !== 'draw' &&
                    editingId !== item.id &&
                    start.id === item.id &&
                    touches === 1 &&
                    Math.abs(e.nativeEvent.pageX - start.pageX) + Math.abs(e.nativeEvent.pageY - start.pageY) > DRAG_THRESHOLD
                  );
                }}
                onResponderGrant={(e) => startItemDrag(item, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                onResponderMove={(e) => moveItemDrag(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                onResponderRelease={endItemDrag}
                onResponderTerminate={endItemDrag}
              >
                <CanvasItemView
                  item={{ ...item, x: 0, y: 0 }}
                    selected={selectedSet.has(item.id)}
                    connectingActive={connectingFromId === item.id}
                  editing={editingId === item.id}
                  scale={scaleState}
                  lowDetail={scaleState < 0.45}
                  dense={currentBoard.items.length > 80}
                  canConnect={item.type === 'task'}
                  onSelect={() => {
                    if (tool === 'multi') select([item.id], true);
                    else select([item.id], false);
                    setEditingId(null);
                  }}
                  onLongPress={() => {
                    if (item.locked) return;
                    select([item.id], false);
                    if (item.type === 'text' || item.type === 'task' || item.type === 'mindmap') setEditingId(item.id);
                  }}
                  onChangeText={(text) => updateText(item.id, text)}
                  onToggleTask={() => toggleTask(item.id)}
                  onEndEdit={() => {
                    commitTextEdit();
                    setEditingId(null);
                  }}
                  onConnectorPress={(side: ConnectorSide) => completeConnect(item.id, side)}
                  onOpenUri={openUri}
                  onResizeStart={(pageX, pageY) => startResize(item, pageX, pageY)}
                  onResizeMove={moveResize}
                  onResizeEnd={endResize}
                  onMindChild={() => addMindChild(item.id)}
                  onMindSibling={() => addMindSibling(item.id)}
                  onMindCollapse={() => toggleMindCollapse(item.id)}
                  onMindTidy={() => tidyMindMap(item.id)}
                />
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {marquee ? <View pointerEvents="none" style={[styles.marquee, marquee]} /> : null}
      {currentBoard.items.length === 0 ? (
        <View pointerEvents="box-none" style={styles.empty}>
          <Text style={styles.emptyTitle}>Start a fieldnote board</Text>
          <Text style={styles.emptyBody}>Double tap the canvas or use Add to place your first card.</Text>
        </View>
      ) : null}
      {tool === 'draw' ? (
        <View pointerEvents="none" style={styles.modeBanner}>
          <Text style={styles.modeBannerText}>Draw mode · two fingers pan and zoom</Text>
        </View>
      ) : null}
      {connectingFromId ? (
        <View style={styles.connectBanner}>
          <Text style={styles.modeBannerText}>Connecting dependency source to target · tap the target task side</Text>
          <Text style={styles.cancelConnect} onPress={cancelConnect}>Cancel</Text>
        </View>
      ) : null}
    </View>
  );
}

export function useViewportSize() {
  const [size, setSize] = useState(() => {
    const win = Dimensions.get('window');
    return {
      width: Number.isFinite(win.width) && win.width > 0 ? win.width : 360,
      height: Number.isFinite(win.height) && win.height > 0 ? win.height : 640,
    };
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setSize({
        width: Number.isFinite(window.width) && window.width > 0 ? window.width : 360,
        height: Number.isFinite(window.height) && window.height > 0 ? window.height : 640,
      });
    });
    return () => sub.remove();
  }, []);

  return size;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    overflow: 'hidden',
  },
  gestureLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.canvas,
  },
  world: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.canvas,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.canvasGrid,
  },
  marquee: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.selection,
    backgroundColor: 'rgba(238,177,116,0.16)',
    zIndex: 25,
  },
  empty: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    maxWidth: 310,
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,250,240,0.82)',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.mutedInk,
    textAlign: 'center',
    lineHeight: 19,
  },
  modeBanner: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 82,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.walnut,
    zIndex: 35,
  },
  modeBannerText: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  connectBanner: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 124,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.walnut,
    zIndex: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelConnect: {
    color: colors.selection,
    fontWeight: '900',
    fontSize: 12,
  },
});
