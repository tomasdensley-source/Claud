import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, View } from 'react-native';
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
import { BoardItem } from '../types';
import {
  MAX_SCALE,
  MIN_SCALE,
  centerOnPoint,
  clampScale,
  fitTransform,
  screenToWorld,
  zoomAboutFocal,
} from '../lib/camera';
import { pickAndBuildFileItems, pickAndBuildPhotoItems } from '../lib/files';
import { placeAtPoint } from '../lib/placement';

const WORLD = 4000;

interface Props {
  viewportWidth: number;
  viewportHeight: number;
  onScaleChange: (scale: number) => void;
  onCameraCenterChange: (center: { x: number; y: number }) => void;
  onToast: (message: string) => void;
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

export function InfiniteCanvas({
  viewportWidth,
  viewportHeight,
  onScaleChange,
  onCameraCenterChange,
  onToast,
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
    resizeItem,
    updateText,
    toggleTask,
    appendDrawingPoint,
    addItem,
    addItems,
    setPanel,
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
  const didInitialFit = useRef(false);
  const lastViewport = useRef({ w: viewportWidth, h: viewportHeight });

  const drawingIdRef = useRef<string | null>(null);
  const toolRef = useRef(tool);
  const selectedRef = useRef(selectedIds);
  const scaleRef = useRef(scaleState);
  toolRef.current = tool;
  selectedRef.current = selectedIds;
  scaleRef.current = scaleState;

  const dragIdsRef = useRef<string[]>([]);
  const dragMovedRef = useRef(false);
  const dragHistoryRef = useRef(false);
  const lastPageRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef<{ id: string; startW: number; startH: number; pageX: number; pageY: number } | null>(
    null,
  );

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
    const focalX = viewportWidth / 2;
    const focalY = viewportHeight / 2;
    const next = zoomAboutFocal(
      zoomRequest.scale,
      focalX,
      focalY,
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

  // Fit once on first ready layout; on rotate keep world center pinned (no forced re-fit).
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
    const worldCenter = screenToWorld(
      prev.w / 2,
      prev.h / 2,
      scale.value,
      tx.value,
      ty.value,
    );
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

  const placeFilesAt = useCallback(
    async (screenX: number, screenY: number) => {
      const world = screenToWorld(screenX, screenY, scale.value, tx.value, ty.value);
      try {
        const items = await pickAndBuildFileItems(world);
        if (items.length === 0) return;
        addItems(items);
        onToast(items.length === 1 ? 'File placed' : `${items.length} files placed`);
      } catch (e) {
        Alert.alert('Could not open files', String(e));
      }
    },
    [addItems, onToast, scale, tx, ty],
  );

  const onLongPressEmpty = useCallback(
    (screenX: number, screenY: number) => {
      const world = screenToWorld(screenX, screenY, scale.value, tx.value, ty.value);
      Alert.alert('Add here', 'What would you like to place?', [
        {
          text: 'Files',
          onPress: () => {
            void placeFilesAt(screenX, screenY);
          },
        },
        {
          text: 'Photos',
          onPress: async () => {
            try {
              const items = await pickAndBuildPhotoItems(world);
              if (items.length === 0) return;
              addItems(items);
              onToast(items.length === 1 ? 'Photo placed' : `${items.length} photos placed`);
            } catch (e) {
              Alert.alert('Could not open photos', String(e));
            }
          },
        },
        {
          text: 'Text note',
          onPress: () => {
            const { x, y } = placeAtPoint(world, 300, 140);
            addItem({
              type: 'text',
              x,
              y,
              width: 300,
              height: 140,
              backgroundColor: colors.paper,
              color: colors.ink,
              text: '',
              fontSize: 22,
              role: 'body',
            });
            onToast('Note added');
          },
        },
        {
          text: 'More…',
          onPress: () => setPanel('add'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [addItem, addItems, onToast, placeFilesAt, scale, setPanel, tx, ty],
  );

  const drawAt = useCallback(
    (x: number, y: number, start: boolean) => {
      const world = screenToWorld(x, y, scale.value, tx.value, ty.value);
      if (start) drawingIdRef.current = null;
      drawingIdRef.current = appendDrawingPoint(drawingIdRef.current, world, start);
    },
    [appendDrawingPoint, scale, tx, ty],
  );

  const endPanReport = useCallback(() => {
    reportScale(scale.value);
    reportCameraCenter();
  }, [reportCameraCenter, reportScale, scale]);

  // One-finger pan only — never fights two-finger pinch.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onBegin(() => {
          'worklet';
          if (pinching.value) return;
          savedTx.value = tx.value;
          savedTy.value = ty.value;
        })
        .onUpdate((e) => {
          'worklet';
          if (pinching.value) return;
          tx.value = savedTx.value + e.translationX;
          ty.value = savedTy.value + e.translationY;
        })
        .onEnd(() => {
          'worklet';
          runOnJS(endPanReport)();
        }),
    [endPanReport, pinching, savedTx, savedTy, tx, ty],
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
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * e.scale));
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
        .minDuration(420)
        .maxDistance(18)
        .onEnd((e, success) => {
          'worklet';
          if (success) runOnJS(onLongPressEmpty)(e.x, e.y);
        }),
    [onLongPressEmpty],
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
      return Gesture.Simultaneous(pinchGesture, Gesture.Exclusive(drawGesture, panGesture));
    }
    return Gesture.Simultaneous(
      pinchGesture,
      panGesture,
      Gesture.Exclusive(longPressGesture, tapGesture),
    );
  }, [tool, pinchGesture, panGesture, drawGesture, longPressGesture, tapGesture]);

  // Top-left origin so translate+scale math matches screenToWorld / pinch focal math.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    transformOrigin: 'top left',
  }));

  const startItemDrag = useCallback(
    (id: string, pageX: number, pageY: number) => {
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
      dragMovedRef.current = false;
      dragHistoryRef.current = false;
      lastPageRef.current = { x: pageX, y: pageY };
      if (toolRef.current === 'multi') {
        if (!selected.includes(id)) select([id], true);
      } else if (!(selected.includes(id) && selected.length > 1)) {
        select([id], false);
      }
      setEditingId(null);
    },
    [select],
  );

  const moveItemDrag = useCallback(
    (pageX: number, pageY: number) => {
      const ids = dragIdsRef.current;
      if (ids.length === 0) return;
      const s = scaleRef.current || 1;
      const dx = (pageX - lastPageRef.current.x) / s;
      const dy = (pageY - lastPageRef.current.y) / s;
      lastPageRef.current = { x: pageX, y: pageY };
      if (dx === 0 && dy === 0) return;
      if (!dragHistoryRef.current) {
        beginHistory();
        dragHistoryRef.current = true;
      }
      dragMovedRef.current = true;
      moveItems(ids, dx, dy, false);
    },
    [beginHistory, moveItems],
  );

  const endItemDrag = useCallback(() => {
    dragIdsRef.current = [];
    dragMovedRef.current = false;
    dragHistoryRef.current = false;
  }, []);

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
      const dw = (pageX - r.pageX) / s;
      const dh = (pageY - r.pageY) / s;
      resizeItem(r.id, r.startW + dw, r.startH + dh, false);
    },
    [resizeItem],
  );

  const endResize = useCallback(() => {
    resizeRef.current = null;
  }, []);

  return (
    <View style={[styles.root, { width: viewportWidth, height: viewportHeight }]}>
      {/* Fixed viewport hit target — gestures use screen-space coords. */}
      <GestureDetector gesture={composed}>
        <View style={styles.gesturePlane} collapsable={false}>
          <Animated.View style={[styles.world, animatedStyle]} collapsable={false}>
            <GridBackground worldSize={WORLD} />
            {currentBoard.items.map((item) => {
              const selected = selectedIds.includes(item.id);
              const passThrough = item.type === 'drawing' && !selected && tool !== 'draw';
              return (
                <View
                  key={item.id}
                  pointerEvents={passThrough ? 'none' : 'box-none'}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    zIndex: item.zIndex + (selected ? 1000 : 0),
                  }}
                >
                  <View
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
                    style={styles.itemHit}
                  >
                    <CanvasItemView
                      item={{ ...item, x: 0, y: 0 }}
                      selected={selected}
                      editing={editingId === item.id}
                      scale={scaleState}
                      onSelect={() => {
                        if (tool === 'multi') select([item.id], true);
                        else select([item.id], false);
                        setEditingId(null);
                      }}
                      onLongPress={() => {
                        select([item.id], false);
                        if (
                          item.type === 'text' ||
                          item.type === 'task' ||
                          item.type === 'mindmap'
                        ) {
                          setEditingId(item.id);
                        }
                      }}
                      onChangeText={(text) => updateText(item.id, text)}
                      onToggleTask={() => toggleTask(item.id)}
                      onEndEdit={() => setEditingId(null)}
                      onResizeStart={(pageX, pageY) =>
                        startResize(item.id, item.width, item.height, pageX, pageY)
                      }
                      onResizeMove={moveResize}
                      onResizeEnd={endResize}
                    />
                  </View>
                </View>
              );
            })}
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
  itemHit: {
    width: '100%',
    height: '100%',
  },
});
