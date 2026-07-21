import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { BoardItem } from '../types';

const WORLD = 2800;

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
  for (const it of items) {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.width);
    maxY = Math.max(maxY, it.y + it.height);
  }
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

  const scale = useSharedValue(0.65);
  const tx = useSharedValue(16);
  const ty = useSharedValue(48);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [scaleState, setScaleState] = useState(0.65);

  const drawingIdRef = useRef<string | null>(null);
  const toolRef = useRef(tool);
  const selectedRef = useRef(selectedIds);
  const scaleRef = useRef(scaleState);
  toolRef.current = tool;
  selectedRef.current = selectedIds;
  scaleRef.current = scaleState;

  const dragIdRef = useRef<string | null>(null);
  const lastPageRef = useRef({ x: 0, y: 0 });

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
    if (viewportWidth < 32 || viewportHeight < 32) return;
    const b = boundsOf(currentBoard.items);
    const pad = 72;
    const w = Math.max(240, b.maxX - b.minX + pad * 2);
    const h = Math.max(240, b.maxY - b.minY + pad * 2);
    const s = Math.min(viewportWidth / w, viewportHeight / h, 1.15);
    applyTransform(
      s,
      viewportWidth / 2 - ((b.minX + b.maxX) / 2) * s,
      viewportHeight / 2 - ((b.minY + b.maxY) / 2) * s,
    );
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
    const timer = setTimeout(fitBoard, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, viewportHeight]);

  const clearSel = useCallback(() => {
    if (toolRef.current === 'draw') return;
    clearSelection();
    setEditingId(null);
  }, [clearSelection]);

  const openAdd = useCallback(() => {
    setPanel('add');
  }, [setPanel]);

  const drawAt = useCallback(
    (x: number, y: number, start: boolean) => {
      const world = {
        x: (x - tx.value) / scale.value,
        y: (y - ty.value) / scale.value,
      };
      if (start) drawingIdRef.current = null;
      drawingIdRef.current = appendDrawingPoint(drawingIdRef.current, world, start);
    },
    [appendDrawingPoint, scale, tx, ty],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
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
        }),
    [savedTx, savedTy, tx, ty],
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
          const next = Math.min(2.4, Math.max(0.28, savedScale.value * e.scale));
          const worldX = (e.focalX - savedTx.value) / savedScale.value;
          const worldY = (e.focalY - savedTy.value) / savedScale.value;
          scale.value = next;
          tx.value = e.focalX - worldX * next;
          ty.value = e.focalY - worldY * next;
        })
        .onEnd(() => {
          'worklet';
          runOnJS(reportScale)(scale.value);
        }),
    [reportScale, savedScale, savedTx, savedTy, scale, tx, ty],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        'worklet';
        runOnJS(clearSel)();
      }),
    [clearSel],
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(480)
        .onEnd((_e, success) => {
          'worklet';
          if (success) runOnJS(openAdd)();
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
        }),
    [drawAt],
  );

  const composed = useMemo(() => {
    if (tool === 'draw') {
      // Two-finger pan/zoom still works via Simultaneous; one-finger draws.
      return Gesture.Simultaneous(pinchGesture, Gesture.Exclusive(drawGesture, panGesture));
    }
    return Gesture.Simultaneous(
      pinchGesture,
      panGesture,
      Gesture.Exclusive(longPressGesture, tapGesture),
    );
  }, [tool, pinchGesture, panGesture, drawGesture, longPressGesture, tapGesture]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const startItemDrag = useCallback(
    (id: string, pageX: number, pageY: number) => {
      dragIdRef.current = id;
      lastPageRef.current = { x: pageX, y: pageY };
      if (toolRef.current === 'multi') select([id], true);
      else select([id], false);
      setEditingId(null);
    },
    [select],
  );

  const moveItemDrag = useCallback(
    (pageX: number, pageY: number) => {
      const id = dragIdRef.current;
      if (!id) return;
      const s = scaleRef.current || 1;
      const dx = (pageX - lastPageRef.current.x) / s;
      const dy = (pageY - lastPageRef.current.y) / s;
      lastPageRef.current = { x: pageX, y: pageY };
      if (dx === 0 && dy === 0) return;
      moveItems([id], dx, dy, false);
    },
    [moveItems],
  );

  const endItemDrag = useCallback(() => {
    dragIdRef.current = null;
  }, []);

  return (
    <View style={[styles.root, { width: viewportWidth, height: viewportHeight }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.world, animatedStyle]} collapsable={false}>
          {currentBoard.items.map((item) => (
            <View
              key={item.id}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                zIndex: item.zIndex + (selectedIds.includes(item.id) ? 1000 : 0),
              }}
              onStartShouldSetResponder={() => toolRef.current !== 'draw'}
              onMoveShouldSetResponder={() => toolRef.current !== 'draw'}
              onResponderGrant={(e) => {
                startItemDrag(item.id, e.nativeEvent.pageX, e.nativeEvent.pageY);
              }}
              onResponderMove={(e) => {
                moveItemDrag(e.nativeEvent.pageX, e.nativeEvent.pageY);
              }}
              onResponderRelease={endItemDrag}
              onResponderTerminate={endItemDrag}
            >
              <CanvasItemView
                item={{ ...item, x: 0, y: 0 }}
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
            </View>
          ))}
        </Animated.View>
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
      setSize({ width: window.width, height: window.height });
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
  world: {
    width: WORLD,
    height: WORLD,
    backgroundColor: colors.canvas,
  },
});
