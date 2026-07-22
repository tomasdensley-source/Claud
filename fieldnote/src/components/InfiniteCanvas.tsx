import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useBoard } from '../store/BoardContext';
import { colors } from '../theme';
import { CanvasItemView } from './CanvasItemView';
import { GridBackground } from './GridBackground';
import { LiveStrokeOverlay } from './LiveStrokeOverlay';
import { BoardItem } from '../types';
import {
  centerOnPoint,
  clampScale,
  fitTransform,
  screenToWorld,
  zoomAboutFocal,
} from '../lib/camera';
import { GESTURE } from '../lib/gesturePriority';
import { hapticImpact } from '../lib/haptics';

const WORLD = 4000;

interface Props {
  viewportWidth: number;
  viewportHeight: number;
  onScaleChange: (scale: number) => void;
  onCameraCenterChange: (center: { x: number; y: number }) => void;
  onToast: (message: string) => void;
  onContextualAdd: (req: {
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  }) => void;
  fitRequest: number;
  zoomRequest: { scale: number; token: number } | null;
  centerRequest: { x: number; y: number; token: number } | null;
}

function boundsOf(items: BoardItem[]) {
  if (items.length === 0) {
    return { minX: 200, minY: 200, maxX: 1400, maxY: 1000 };
  }
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

type DragVisual = { ids: string[]; dx: number; dy: number };

interface BoardItemNodeProps {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  scale: number;
  tool: string;
  dragDx: number;
  dragDy: number;
  onSelect: (id: string) => void;
  onLongPressEdit: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: () => void;
  onChangeText: (id: string, text: string) => void;
  onToggleTask: (id: string) => void;
  onEndEdit: () => void;
  onResizeStart: (id: string, width: number, height: number, pageX: number, pageY: number) => void;
  onResizeMove: (pageX: number, pageY: number) => void;
  onResizeEnd: () => void;
}

const BoardItemNode = memo(function BoardItemNode({
  item,
  selected,
  editing,
  scale,
  tool,
  dragDx,
  dragDy,
  onSelect,
  onLongPressEdit,
  onDragStart,
  onDragMove,
  onDragEnd,
  onChangeText,
  onToggleTask,
  onEndEdit,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: BoardItemNodeProps) {
  const dragging = dragDx !== 0 || dragDy !== 0;

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd(() => {
          'worklet';
          runOnJS(onSelect)(item.id);
        }),
    [item.id, onSelect],
  );

  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(420)
        .maxDistance(14)
        .onEnd((_e, success) => {
          'worklet';
          if (success) runOnJS(onLongPressEdit)(item.id);
        }),
    [item.id, onLongPressEdit],
  );

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(4)
        .averageTouches(false)
        .onStart(() => {
          'worklet';
          runOnJS(onDragStart)(item.id);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(onDragMove)(e.translationX / scale, e.translationY / scale);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(onDragEnd)();
        })
        .onFinalize((_e, success) => {
          'worklet';
          // Commit even if the gesture was interrupted after movement began.
          if (!success) runOnJS(onDragEnd)();
        }),
    [item.id, onDragEnd, onDragMove, onDragStart, scale],
  );

  const composed = useMemo(
    () => Gesture.Exclusive(drag, longPress, tap),
    [drag, longPress, tap],
  );

  // Drawings/regions don't block empty canvas unless selected.
  const passThrough =
    tool === 'draw' ||
    ((item.type === 'drawing' || item.type === 'region') && !selected);

  if (passThrough) {
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: item.x + dragDx,
          top: item.y + dragDy,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex + (selected ? 1000 : 0),
          opacity: dragging ? 0.92 : 1,
        }}
      >
        <CanvasItemView
          item={{ ...item, x: 0, y: 0 }}
          selected={selected}
          editing={false}
          scale={scale}
          gestureManaged
          onSelect={() => undefined}
          onLongPress={() => undefined}
          onChangeText={() => undefined}
          onToggleTask={() => undefined}
          onEndEdit={() => undefined}
        />
      </View>
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <View
        collapsable={false}
        style={{
          position: 'absolute',
          left: item.x + dragDx,
          top: item.y + dragDy,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex + (selected ? 1000 : 0),
          opacity: dragging ? 0.92 : 1,
        }}
      >
        <CanvasItemView
          item={{ ...item, x: 0, y: 0 }}
          selected={selected}
          editing={editing}
          scale={scale}
          gestureManaged
          onSelect={() => onSelect(item.id)}
          onLongPress={() => onLongPressEdit(item.id)}
          onChangeText={(text) => onChangeText(item.id, text)}
          onToggleTask={() => onToggleTask(item.id)}
          onEndEdit={onEndEdit}
          onResizeStart={(pageX, pageY) =>
            onResizeStart(item.id, item.width, item.height, pageX, pageY)
          }
          onResizeMove={onResizeMove}
          onResizeEnd={onResizeEnd}
        />
      </View>
    </GestureDetector>
  );
});

export function InfiniteCanvas({
  viewportWidth,
  viewportHeight,
  onScaleChange,
  onCameraCenterChange,
  onToast,
  onContextualAdd,
  fitRequest,
  zoomRequest,
  centerRequest,
}: Props) {
  const {
    currentBoard,
    selectedIds,
    tool,
    drawColor,
    drawWidth,
    select,
    selectInRect,
    clearSelection,
    moveItems,
    resizeItem,
    updateText,
    toggleTask,
    addDrawingStroke,
    beginHistory,
  } = useBoard();

  const scale = useSharedValue(0.7);
  const tx = useSharedValue(40);
  const ty = useSharedValue(80);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const pinching = useSharedValue(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [scaleState, setScaleState] = useState(0.7);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [liveStroke, setLiveStroke] = useState<{
    color: string;
    width: number;
    points: { x: number; y: number }[];
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const didInitialFit = useRef(false);
  const lastViewport = useRef({ w: viewportWidth, h: viewportHeight });
  const toolRef = useRef(tool);
  const selectedRef = useRef(selectedIds);
  const scaleRef = useRef(scaleState);
  const dragIdsRef = useRef<string[]>([]);
  const dragCommittedRef = useRef(false);
  const liveStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const strokeRafRef = useRef<number | null>(null);
  const resizeRef = useRef<{
    id: string;
    startW: number;
    startH: number;
    pageX: number;
    pageY: number;
  } | null>(null);

  toolRef.current = tool;
  selectedRef.current = selectedIds;
  scaleRef.current = scaleState;

  const reportScale = useCallback(
    (s: number) => {
      setScaleState(s);
      onScaleChange(s);
    },
    [onScaleChange],
  );

  const reportCameraCenter = useCallback(() => {
    const center = screenToWorld(
      viewportWidth / 2,
      viewportHeight / 2,
      scale.value,
      tx.value,
      ty.value,
    );
    onCameraCenterChange(center);
  }, [onCameraCenterChange, scale, tx, ty, viewportHeight, viewportWidth]);

  const applyTransform = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      const s = clampScale(nextScale);
      scale.value = s;
      tx.value = nextTx;
      ty.value = nextTy;
      reportScale(s);
      const center = screenToWorld(viewportWidth / 2, viewportHeight / 2, s, nextTx, nextTy);
      onCameraCenterChange(center);
    },
    [onCameraCenterChange, reportScale, scale, tx, ty, viewportHeight, viewportWidth],
  );

  const fitBoard = useCallback(() => {
    if (viewportWidth < 32 || viewportHeight < 32) return;
    const b = boundsOf(currentBoard.items);
    const next = fitTransform(viewportWidth, viewportHeight, b.minX, b.minY, b.maxX, b.maxY);
    applyTransform(next.scale, next.tx, next.ty);
  }, [applyTransform, currentBoard.items, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (fitRequest > 0) fitBoard();
  }, [fitRequest, fitBoard]);

  useEffect(() => {
    if (!zoomRequest) return;
    const next = zoomAboutFocal(
      zoomRequest.scale,
      viewportWidth / 2,
      viewportHeight / 2,
      scale.value,
      tx.value,
      ty.value,
    );
    applyTransform(next.scale, next.tx, next.ty);
  }, [zoomRequest, applyTransform, scale, tx, ty, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (!centerRequest) return;
    const next = centerOnPoint(
      centerRequest.x,
      centerRequest.y,
      scale.value,
      viewportWidth,
      viewportHeight,
    );
    applyTransform(next.scale, next.tx, next.ty);
  }, [centerRequest, applyTransform, scale, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (viewportWidth < 32 || viewportHeight < 32) return;
    if (!didInitialFit.current) {
      didInitialFit.current = true;
      const timer = setTimeout(fitBoard, 60);
      lastViewport.current = { w: viewportWidth, h: viewportHeight };
      return () => clearTimeout(timer);
    }
    const prev = lastViewport.current;
    if (prev.w === viewportWidth && prev.h === viewportHeight) return;
    const worldCenter = screenToWorld(prev.w / 2, prev.h / 2, scale.value, tx.value, ty.value);
    lastViewport.current = { w: viewportWidth, h: viewportHeight };
    const next = centerOnPoint(
      worldCenter.x,
      worldCenter.y,
      scale.value,
      viewportWidth,
      viewportHeight,
    );
    applyTransform(next.scale, next.tx, next.ty);
  }, [viewportWidth, viewportHeight, fitBoard, applyTransform, scale, tx, ty]);

  const clearSel = useCallback(() => {
    if (toolRef.current === 'draw') return;
    clearSelection();
    setEditingId(null);
  }, [clearSelection]);

  const onLongPressEmpty = useCallback(
    (screenX: number, screenY: number) => {
      const world = screenToWorld(screenX, screenY, scale.value, tx.value, ty.value);
      void hapticImpact('medium');
      onContextualAdd({
        screenX,
        screenY,
        worldX: world.x,
        worldY: world.y,
      });
    },
    [onContextualAdd, scale, tx, ty],
  );

  const flushLiveStrokePreview = useCallback(() => {
    strokeRafRef.current = null;
    const points = liveStrokeRef.current;
    if (points.length === 0) return;
    setLiveStroke({
      color: drawColor,
      width: drawWidth,
      points: points.slice(),
    });
  }, [drawColor, drawWidth]);

  const strokeDoneRef = useRef(false);

  const startStroke = useCallback(
    (screenX: number, screenY: number) => {
      strokeDoneRef.current = false;
      const world = screenToWorld(screenX, screenY, scale.value, tx.value, ty.value);
      liveStrokeRef.current = [world];
      setLiveStroke({ color: drawColor, width: drawWidth, points: [world] });
    },
    [drawColor, drawWidth, scale, tx, ty],
  );

  const moveStroke = useCallback(
    (screenX: number, screenY: number) => {
      if (strokeDoneRef.current) return;
      const world = screenToWorld(screenX, screenY, scale.value, tx.value, ty.value);
      const pts = liveStrokeRef.current;
      const last = pts[pts.length - 1];
      if (last && Math.hypot(world.x - last.x, world.y - last.y) < 1.2) return;
      pts.push(world);
      if (strokeRafRef.current == null) {
        strokeRafRef.current = requestAnimationFrame(flushLiveStrokePreview);
      }
    },
    [flushLiveStrokePreview, scale, tx, ty],
  );

  const endStroke = useCallback(() => {
    if (strokeDoneRef.current) return;
    strokeDoneRef.current = true;
    if (strokeRafRef.current != null) {
      cancelAnimationFrame(strokeRafRef.current);
      strokeRafRef.current = null;
    }
    const points = liveStrokeRef.current;
    liveStrokeRef.current = [];
    setLiveStroke(null);
    if (points.length < 2) return;
    addDrawingStroke(points, drawColor, drawWidth);
  }, [addDrawingStroke, drawColor, drawWidth]);

  const endPanReport = useCallback(() => {
    reportScale(scale.value);
    reportCameraCenter();
  }, [reportCameraCenter, reportScale, scale]);

  // Blueprint: two-finger navigation ALWAYS controls pan (even over objects).
  const twoFingerPan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(GESTURE.NAV_MIN_POINTERS)
        .maxPointers(2)
        .averageTouches(true)
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
        .onEnd(() => {
          'worklet';
          runOnJS(endPanReport)();
        }),
    [endPanReport, savedTx, savedTy, tx, ty],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          'worklet';
          pinching.value = true;
          savedScale.value = scale.value;
          savedTx.value = tx.value;
          savedTy.value = ty.value;
        })
        .onUpdate((e) => {
          'worklet';
          const next = Math.min(
            GESTURE.PINCH_MAX_SCALE,
            Math.max(GESTURE.PINCH_MIN_SCALE, savedScale.value * e.scale),
          );
          const worldX = (e.focalX - savedTx.value) / savedScale.value;
          const worldY = (e.focalY - savedTy.value) / savedScale.value;
          scale.value = next;
          tx.value = e.focalX - worldX * next;
          ty.value = e.focalY - worldY * next;
        })
        .onEnd(() => {
          'worklet';
          pinching.value = false;
          runOnJS(endPanReport)();
        })
        .onFinalize(() => {
          'worklet';
          pinching.value = false;
        }),
    [endPanReport, pinching, savedScale, savedTx, savedTy, scale, tx, ty],
  );

  const navigationGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, twoFingerPan),
    [pinchGesture, twoFingerPan],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd(() => {
          'worklet';
          runOnJS(clearSel)();
        }),
    [clearSel],
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(GESTURE.LONG_PRESS_MS)
        .maxDistance(GESTURE.LONG_PRESS_MAX_DIST)
        .onEnd((e, success) => {
          'worklet';
          if (success) runOnJS(onLongPressEmpty)(e.x, e.y);
        }),
    [onLongPressEmpty],
  );

  const marqueeStart = useCallback(
    (x: number, y: number) => {
      const world = screenToWorld(x, y, scale.value, tx.value, ty.value);
      setMarquee({ x: world.x, y: world.y, width: 0, height: 0 });
    },
    [scale, tx, ty],
  );

  const marqueeMove = useCallback(
    (x: number, y: number, txScreen: number, tyScreen: number) => {
      const origin = screenToWorld(
        x - txScreen,
        y - tyScreen,
        scale.value,
        tx.value,
        ty.value,
      );
      const cur = screenToWorld(x, y, scale.value, tx.value, ty.value);
      setMarquee({
        x: origin.x,
        y: origin.y,
        width: cur.x - origin.x,
        height: cur.y - origin.y,
      });
    },
    [scale, tx, ty],
  );

  const marqueeEnd = useCallback(() => {
    setMarquee((rect) => {
      if (rect && (Math.abs(rect.width) > 8 || Math.abs(rect.height) > 8)) {
        selectInRect(rect, toolRef.current === 'multi');
        void hapticImpact('light');
      }
      return null;
    });
  }, [selectInRect]);

  // One-finger empty space = marquee (not pan). Navigation is two-finger only.
  const marqueeGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(GESTURE.MARQUEE_MIN_DIST)
        .onBegin((e) => {
          'worklet';
          runOnJS(marqueeStart)(e.x, e.y);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(marqueeMove)(e.x, e.y, e.translationX, e.translationY);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(marqueeEnd)();
        }),
    [marqueeEnd, marqueeMove, marqueeStart],
  );

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(0)
        .onBegin((e) => {
          'worklet';
          runOnJS(startStroke)(e.x, e.y);
        })
        .onUpdate((e) => {
          'worklet';
          runOnJS(moveStroke)(e.x, e.y);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(endStroke)();
        }),
    [endStroke, moveStroke, startStroke],
  );

  const composed = useMemo(() => {
    if (tool === 'draw') {
      return Gesture.Simultaneous(navigationGesture, drawGesture);
    }
    return Gesture.Simultaneous(
      navigationGesture,
      Gesture.Exclusive(longPressGesture, marqueeGesture, tapGesture),
    );
  }, [tool, navigationGesture, drawGesture, longPressGesture, marqueeGesture, tapGesture]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    transformOrigin: 'top left',
  }));

  const onSelectItem = useCallback(
    (id: string) => {
      if (toolRef.current === 'multi') select([id], true);
      else select([id], false);
      setEditingId(null);
    },
    [select],
  );

  const onLongPressEdit = useCallback(
    (id: string) => {
      select([id], false);
      const item = currentBoard.items.find((it) => it.id === id);
      if (item && (item.type === 'text' || item.type === 'task' || item.type === 'mindmap')) {
        setEditingId(id);
      }
    },
    [currentBoard.items, select],
  );

  const onDragStart = useCallback(
    (id: string) => {
      const selected = selectedRef.current;
      const ids =
        toolRef.current === 'multi'
          ? selected.includes(id)
            ? selected
            : [...selected, id]
          : selected.includes(id) && selected.length > 1
            ? selected
            : [id];
      dragIdsRef.current = ids;
      dragCommittedRef.current = false;
      setDragVisual({ ids, dx: 0, dy: 0 });
      if (toolRef.current === 'multi') {
        if (!selected.includes(id)) select([id], true);
      } else if (!(selected.includes(id) && selected.length > 1)) {
        select([id], false);
      }
      setEditingId(null);
    },
    [select],
  );

  const onDragMove = useCallback((dx: number, dy: number) => {
    const ids = dragIdsRef.current;
    if (ids.length === 0) return;
    setDragVisual({ ids, dx, dy });
  }, []);

  const dragVisualRef = useRef(dragVisual);
  dragVisualRef.current = dragVisual;

  const onDragEndStable = useCallback(() => {
    if (dragCommittedRef.current) return;
    dragCommittedRef.current = true;
    const ids = dragIdsRef.current;
    const visual = dragVisualRef.current;
    const dx = visual?.dx ?? 0;
    const dy = visual?.dy ?? 0;
    dragIdsRef.current = [];
    setDragVisual(null);
    if (ids.length === 0) return;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    beginHistory();
    moveItems(ids, dx, dy, false);
  }, [beginHistory, moveItems]);

  const startResize = useCallback(
    (id: string, width: number, height: number, pageX: number, pageY: number) => {
      resizeRef.current = { id, startW: width, startH: height, pageX, pageY };
      beginHistory();
      select([id], false);
    },
    [beginHistory, select],
  );

  const moveResize = useCallback(
    (pageX: number, pageY: number) => {
      const r = resizeRef.current;
      if (!r) return;
      const s = scaleRef.current || 1;
      resizeItem(r.id, r.startW + (pageX - r.pageX) / s, r.startH + (pageY - r.pageY) / s, false);
    },
    [resizeItem],
  );

  const endResize = useCallback(() => {
    resizeRef.current = null;
  }, []);

  // Stable z-order render: lower first, selected later for handles.
  const sortedItems = useMemo(
    () =>
      [...currentBoard.items].sort((a, b) => {
        const az = a.zIndex + (selectedIds.includes(a.id) ? 100000 : 0);
        const bz = b.zIndex + (selectedIds.includes(b.id) ? 100000 : 0);
        return az - bz;
      }),
    [currentBoard.items, selectedIds],
  );

  return (
    <View style={[styles.root, { width: viewportWidth, height: viewportHeight }]}>
      <GestureDetector gesture={composed}>
        <View style={styles.gesturePlane} collapsable={false}>
          <Animated.View style={[styles.world, animatedStyle]} collapsable={false}>
            <GridBackground worldSize={WORLD} />
            {sortedItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              const dragging = dragVisual?.ids.includes(item.id);
              return (
                <BoardItemNode
                  key={item.id}
                  item={item}
                  selected={selected}
                  editing={editingId === item.id}
                  scale={scaleState}
                  tool={tool}
                  dragDx={dragging ? dragVisual!.dx : 0}
                  dragDy={dragging ? dragVisual!.dy : 0}
                  onSelect={onSelectItem}
                  onLongPressEdit={onLongPressEdit}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEndStable}
                  onChangeText={updateText}
                  onToggleTask={toggleTask}
                  onEndEdit={() => setEditingId(null)}
                  onResizeStart={startResize}
                  onResizeMove={moveResize}
                  onResizeEnd={endResize}
                />
              );
            })}
            {liveStroke && liveStroke.points.length > 0 ? (
              <LiveStrokeOverlay
                worldSize={WORLD}
                color={liveStroke.color}
                width={liveStroke.width}
                points={liveStroke.points}
              />
            ) : null}
            {marquee ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: Math.min(marquee.x, marquee.x + marquee.width),
                  top: Math.min(marquee.y, marquee.y + marquee.height),
                  width: Math.max(1, Math.abs(marquee.width)),
                  height: Math.max(1, Math.abs(marquee.height)),
                  borderWidth: 1.5,
                  borderColor: colors.clayDeep,
                  backgroundColor: 'rgba(203,125,70,0.12)',
                }}
              />
            ) : null}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

export function useViewportSize() {
  const [size, setSize] = useState(() => {
    const win = Dimensions.get('window');
    return {
      width: win.width > 0 ? win.width : 360,
      height: win.height > 0 ? win.height : 640,
    };
  });

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setSize({
        width: window.width > 0 ? window.width : 360,
        height: window.height > 0 ? window.height : 640,
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
  gesturePlane: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.canvas,
  },
  world: {
    width: WORLD,
    height: WORLD,
    backgroundColor: colors.canvas,
  },
});
