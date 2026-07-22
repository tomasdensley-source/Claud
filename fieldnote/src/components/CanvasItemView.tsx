import React, { useCallback, useMemo, useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Line, Path, Rect as SvgRect } from 'react-native-svg';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';
import { SEED_IMAGES } from '../lib/seedImages';
import { MarkdownBlocks, MarkdownInline } from './Markdown';
import { haptics } from '../lib/haptics';
import {
  computeResizeRect,
  MIN_ITEM_HEIGHT,
  MIN_ITEM_WIDTH,
  ResizeCorner,
  ResizeRect,
} from '../lib/resize';

// Deliberate hold-to-complete duration for incomplete, unblocked tasks.
const TASK_HOLD_MS = 3000;

interface Props {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  scale: number;
  onSelect: () => void;
  onLongPress: () => void;
  onChangeText: (text: string) => void;
  onToggleTask: () => void;
  onEndEdit: () => void;
  onResize: (rect: ResizeRect, commit: boolean) => void;
  blocked?: boolean;
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

export function CanvasItemView({
  item,
  selected,
  editing,
  scale,
  onSelect,
  onLongPress,
  onChangeText,
  onToggleTask,
  onEndEdit,
  onResize,
  blocked = false,
}: Props) {
  const handleSize = Math.max(10, 12 / scale);
  const taskGlow = useSharedValue(0);
  const taskHoldCompleted = useRef(false);

  const taskGlowStyle = useAnimatedStyle(() => ({
    opacity: taskGlow.value * 0.35,
  }));

  const completeTask = useCallback(() => {
    haptics.success();
    onToggleTask();
  }, [onToggleTask]);

  const onTaskPressIn = useCallback(() => {
    if (item.type !== 'task') return;
    if (item.done || blocked) return;
    taskHoldCompleted.current = false;
    taskGlow.value = withTiming(1, { duration: TASK_HOLD_MS }, (finished) => {
      if (finished) {
        taskHoldCompleted.current = true;
        runOnJS(completeTask)();
      }
    });
  }, [item, blocked, taskGlow, completeTask]);

  const onTaskPressOut = useCallback(() => {
    if (item.type !== 'task' || taskHoldCompleted.current) return;
    cancelAnimation(taskGlow);
    taskGlow.value = withTiming(0, { duration: 150 });
  }, [item, taskGlow]);

  const onTaskPress = useCallback(() => {
    if (item.type !== 'task') return;
    if (!item.done) return;
    // Completion is hold-only (see onTaskPressIn); a quick tap only undoes it.
    haptics.light();
    onToggleTask();
  }, [item, onToggleTask]);

  const content = useMemo(() => {
    switch (item.type) {
      case 'text':
        if (editing) {
          return (
            <TextInput
              autoFocus
              multiline
              value={item.text}
              onChangeText={onChangeText}
              onBlur={onEndEdit}
              style={[
                styles.text,
                {
                  color: item.color ?? colors.ink,
                  fontSize: item.fontSize,
                  fontWeight: item.fontWeight ?? '400',
                },
              ]}
              placeholder="Write something..."
              placeholderTextColor={colors.mutedInk}
            />
          );
        }
        if (!item.text) {
          return (
            <Text
              style={[
                styles.text,
                { color: item.color ?? colors.ink, fontSize: item.fontSize, fontWeight: item.fontWeight ?? '400' },
              ]}
            >
              Write something...
            </Text>
          );
        }
        return (
          <MarkdownBlocks
            source={item.text}
            baseStyle={[
              styles.text,
              {
                color: item.color ?? colors.ink,
                fontSize: item.fontSize,
                fontWeight: item.fontWeight ?? '400',
              },
            ]}
          />
        );
      case 'image': {
        const source = item.assetKey
          ? SEED_IMAGES[item.assetKey]
          : item.uri
            ? { uri: item.uri }
            : null;
        if (!source) {
          return <View style={styles.imageFallback} />;
        }
        return <Image source={source} style={styles.image} resizeMode="cover" />;
      }
      case 'task':
        return (
          <Pressable
            style={[styles.taskRow, blocked && styles.taskBlocked]}
            onPress={onTaskPress}
            onPressIn={onTaskPressIn}
            onPressOut={onTaskPressOut}
          >
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.taskGlow, taskGlowStyle]}
            />
            <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
              {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            {editing ? (
              <TextInput
                autoFocus
                value={item.text}
                onChangeText={onChangeText}
                onBlur={onEndEdit}
                style={[
                  styles.taskText,
                  item.color ? { color: item.color } : null,
                  item.done && styles.taskDone,
                ]}
              />
            ) : item.text ? (
              <MarkdownInline
                source={item.text}
                baseStyle={[
                  styles.taskText,
                  item.color ? { color: item.color } : null,
                  item.done && styles.taskDone,
                ]}
              />
            ) : (
              <Text style={[styles.taskText, item.done && styles.taskDone]}>New task</Text>
            )}
          </Pressable>
        );
      case 'mindmap':
        return (
          <View style={styles.mindmap}>
            <View style={styles.mindmapHub}>
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  style={[styles.mindmapHubText, item.color ? { color: item.color } : null]}
                />
              ) : (
                <Text style={[styles.mindmapHubText, item.color ? { color: item.color } : null]}>
                  {item.text || 'Idea'}
                </Text>
              )}
            </View>
            <View style={styles.mindmapChildren}>
              {(item.children.length ? item.children : ['Branch', 'Branch']).map((c, i) => (
                <View key={`${c}-${i}`} style={styles.mindmapChild}>
                  <Text style={styles.mindmapChildText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      case 'region':
        return (
          <View style={styles.region}>
            <Text style={styles.regionLabel}>{item.label || 'Region'}</Text>
          </View>
        );
      case 'shape': {
        const stroke = item.color ?? colors.ink;
        return (
          <Svg width="100%" height="100%">
            {item.shape === 'ellipse' ? (
              <Ellipse
                cx="50%"
                cy="50%"
                rx="45%"
                ry="40%"
                stroke={stroke}
                strokeWidth={3}
                fill={item.backgroundColor ?? 'transparent'}
              />
            ) : item.shape === 'line' ? (
              <Line x1="8%" y1="50%" x2="92%" y2="50%" stroke={stroke} strokeWidth={4} />
            ) : (
              <SvgRect
                x="8%"
                y="12%"
                width="84%"
                height="76%"
                rx={12}
                stroke={stroke}
                strokeWidth={3}
                fill={item.backgroundColor ?? 'transparent'}
              />
            )}
          </Svg>
        );
      }
      case 'drawing':
        return (
          <Svg width="100%" height="100%">
            {item.paths.map((path, i) => (
              <Path
                key={i}
                d={pointsToPath(path.points)}
                stroke={path.color}
                strokeWidth={path.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        );
      case 'file':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>📄</Text>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        );
      case 'folder':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>📁</Text>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.fileMeta}>{item.fileCount} files</Text>
          </View>
        );
      default:
        return null;
    }
  }, [
    editing,
    item,
    onChangeText,
    onEndEdit,
    onToggleTask,
    blocked,
    onTaskPress,
    onTaskPressIn,
    onTaskPressOut,
    taskGlowStyle,
  ]);

  const transparentBg =
    item.type === 'drawing' || item.type === 'shape' || item.type === 'region';

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={[
        styles.item,
        shadows.card,
        {
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex + (selected ? 1000 : 0),
          backgroundColor: transparentBg
            ? 'transparent'
            : item.backgroundColor ?? colors.paper,
          borderColor: selected ? colors.selection : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
        item.type === 'region' && styles.regionOuter,
      ]}
    >
      <View style={[styles.contentClip, item.type === 'region' && styles.contentClipFlush]}>
        {content}
      </View>
      {selected ? (
        <>
          <ResizeHandle
            corner="tl"
            size={handleSize}
            positionStyle={{ left: -handleSize / 2, top: -handleSize / 2 }}
            item={item}
            scale={scale}
            onResize={onResize}
          />
          <ResizeHandle
            corner="tr"
            size={handleSize}
            positionStyle={{ right: -handleSize / 2, top: -handleSize / 2 }}
            item={item}
            scale={scale}
            onResize={onResize}
          />
          <ResizeHandle
            corner="bl"
            size={handleSize}
            positionStyle={{ left: -handleSize / 2, bottom: -handleSize / 2 }}
            item={item}
            scale={scale}
            onResize={onResize}
          />
          <ResizeHandle
            corner="br"
            size={handleSize}
            positionStyle={{ right: -handleSize / 2, bottom: -handleSize / 2 }}
            item={item}
            scale={scale}
            onResize={onResize}
          />
        </>
      ) : null}
    </Pressable>
  );
}

function ResizeHandle({
  corner,
  size,
  positionStyle,
  item,
  scale,
  onResize,
}: {
  corner: ResizeCorner;
  size: number;
  positionStyle: ViewStyle;
  item: BoardItem;
  scale: number;
  onResize: (rect: ResizeRect, commit: boolean) => void;
}) {
  const start = useSharedValue<ResizeRect>({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  });

  const commit = useCallback(
    (dx: number, dy: number, isCommit: boolean) => {
      const rect = computeResizeRect(corner, start.value, dx, dy, MIN_ITEM_WIDTH, MIN_ITEM_HEIGHT);
      onResize(rect, isCommit);
    },
    [corner, onResize, start],
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = { x: item.x, y: item.y, width: item.width, height: item.height };
    })
    .onUpdate((e) => {
      runOnJS(commit)(e.translationX / scale, e.translationY / scale, false);
    })
    .onEnd((e) => {
      runOnJS(commit)(e.translationX / scale, e.translationY / scale, true);
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.handle, positionStyle, { width: size, height: size }]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    borderRadius: radii.card,
  },
  // Clips content (text, images, drawings) to the card's rounded corners.
  // Kept separate from the outer card so resize handles — positioned just
  // outside the card's edges — aren't clipped along with it.
  contentClip: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.card,
    padding: 18,
  },
  contentClipFlush: {
    padding: 0,
  },
  text: {
    fontFamily: 'System',
    lineHeight: undefined,
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    backgroundColor: '#e8dcc8',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskBlocked: {
    opacity: 0.55,
  },
  taskGlow: {
    borderRadius: radii.card,
    backgroundColor: colors.amber,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.clayDeep,
    borderColor: colors.clayDeep,
  },
  checkMark: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  taskText: {
    flex: 1,
    color: colors.ink,
    fontSize: 20,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.mutedInk,
  },
  mindmap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  mindmapHub: {
    backgroundColor: colors.clay,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  mindmapHubText: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 18,
  },
  mindmapChildren: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  mindmapChild: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.12)',
  },
  mindmapChildText: {
    color: colors.ink,
    fontSize: 14,
  },
  regionOuter: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(52,38,29,0.28)',
    backgroundColor: 'rgba(233,178,127,0.12)',
  },
  region: {
    flex: 1,
    padding: 14,
  },
  regionLabel: {
    color: colors.mutedInk,
    fontWeight: '600',
    fontSize: 16,
  },
  fileCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  fileGlyph: {
    fontSize: 28,
  },
  fileName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  fileMeta: {
    color: colors.mutedInk,
    fontSize: 13,
  },
  handle: {
    position: 'absolute',
    backgroundColor: colors.paperStrong,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
  },
});
