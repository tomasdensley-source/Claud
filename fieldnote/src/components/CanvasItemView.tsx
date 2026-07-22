import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Ellipse, Line, Path, Rect as SvgRect } from 'react-native-svg';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';
import { SEED_IMAGES } from '../lib/seedImages';
import { MarkdownView, looksLikeMarkdown } from './MarkdownView';

interface Props {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  scale: number;
  gestureManaged?: boolean;
  /** External 0–1 hold progress for task water-flow (gesture-driven). */
  holdProgress?: number;
  onSelect: () => void;
  onLongPress: () => void;
  onChangeText: (text: string) => void;
  onToggleTask: () => void;
  onHoldCompleteTask?: () => void;
  taskBlocked?: boolean;
  onToggleCollapse?: () => void;
  descendantCount?: number;
  onEndEdit: () => void;
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
  scale: _scale,
  gestureManaged = false,
  holdProgress: holdProgressProp,
  onSelect,
  onLongPress,
  onChangeText,
  onToggleTask,
  onHoldCompleteTask,
  taskBlocked = false,
  onToggleCollapse,
  descendantCount = 0,
  onEndEdit,
}: Props) {
  const [localHold, setLocalHold] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStarted = useRef(0);
  const holdProgress = holdProgressProp ?? localHold;

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  const stopHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setLocalHold(0);
  };

  const startHold = () => {
    if (gestureManaged) return;
    if (item.type !== 'task' || item.done) {
      onToggleTask();
      return;
    }
    if (taskBlocked) {
      onToggleTask();
      return;
    }
    holdStarted.current = Date.now();
    setLocalHold(0.05);
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStarted.current;
      const p = Math.min(1, elapsed / 3000);
      setLocalHold(p);
      if (p >= 1) {
        stopHold();
        onHoldCompleteTask?.();
      }
    }, 50);
  };

  const content = useMemo(() => {
    switch (item.type) {
      case 'text': {
        const showMarkdown =
          !editing && (item.markdown === true || looksLikeMarkdown(item.text || ''));
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
              placeholder={'# Heading\n\nWrite **markdown**...'}
              placeholderTextColor={colors.mutedInk}
            />
          );
        }
        if (showMarkdown) {
          return (
            <MarkdownView
              source={item.text || ''}
              color={item.color ?? colors.ink}
              fontSize={item.fontSize}
            />
          );
        }
        return (
          <Text
            style={[
              styles.text,
              {
                color: item.color ?? colors.ink,
                fontSize: item.fontSize,
                fontWeight: item.fontWeight ?? '400',
              },
            ]}
          >
            {item.text || 'Write something...'}
          </Text>
        );
      }
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
      case 'task': {
        const glow =
          holdProgress <= 0
            ? 0
            : holdProgress < 0.33
              ? 0.2
              : holdProgress < 0.66
                ? 0.45
                : 0.75;
        const taskBody =
          !editing && item.markdown && looksLikeMarkdown(item.text || '') ? (
            <MarkdownView source={item.text || ''} color={colors.ink} fontSize={16} />
          ) : (
            <Text style={[styles.taskText, item.done && styles.taskDone]}>
              {item.text || 'New task'}
            </Text>
          );
        return (
          <Pressable
            style={[
              styles.taskRow,
              {
                backgroundColor: item.done
                  ? 'rgba(47,158,107,0.18)'
                  : `rgba(237,182,74,${glow})`,
                borderRadius: 12,
                padding: 4,
              },
            ]}
            onPressIn={gestureManaged ? undefined : startHold}
            onPressOut={gestureManaged ? undefined : stopHold}
            pointerEvents={gestureManaged ? 'none' : 'auto'}
          >
            <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
              {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            {editing ? (
              <TextInput
                autoFocus
                value={item.text}
                onChangeText={onChangeText}
                onBlur={onEndEdit}
                style={[styles.taskText, item.done && styles.taskDone]}
              />
            ) : (
              <View style={{ flex: 1 }}>
                {taskBody}
                {taskBlocked && !item.done ? (
                  <Text style={styles.blockedHint}>Waiting on water-flow</Text>
                ) : !item.done ? (
                  <Text style={styles.blockedHint}>Hold 3s to complete</Text>
                ) : null}
              </View>
            )}
          </Pressable>
        );
      }
      case 'mindmap':
        return (
          <View style={styles.mindmap}>
            <View
              style={[
                styles.mindmapNode,
                item.branchColor ? { borderColor: item.branchColor } : null,
              ]}
            >
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  style={styles.mindmapText}
                />
              ) : (
                <Text style={styles.mindmapText}>{item.text || 'Idea'}</Text>
              )}
            </View>
            {onToggleCollapse ? (
              <Pressable onPress={onToggleCollapse} style={styles.collapseBtn} hitSlop={8}>
                <Text style={styles.collapseText}>
                  {item.collapsed ? `▸ ${descendantCount}` : '▾'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      case 'region':
        return (
          <View
            style={[
              styles.region,
              item.frameColor ? { backgroundColor: item.frameColor } : null,
            ]}
          >
            <Text style={styles.regionLabel}>{item.label || 'Region'}</Text>
          </View>
        );
      case 'shape':
        return (
          <Svg width="100%" height="100%">
            {item.shape === 'ellipse' ? (
              <Ellipse
                cx="50%"
                cy="50%"
                rx="42%"
                ry="38%"
                stroke={colors.ink}
                strokeWidth={3}
                fill={item.backgroundColor ?? 'transparent'}
              />
            ) : item.shape === 'line' ? (
              <Line
                x1="8%"
                y1="50%"
                x2="92%"
                y2="50%"
                stroke={colors.ink}
                strokeWidth={4}
              />
            ) : (
              <SvgRect
                x="8%"
                y="12%"
                width="84%"
                height="76%"
                rx={12}
                stroke={colors.ink}
                strokeWidth={3}
                fill={item.backgroundColor ?? 'transparent'}
              />
            )}
          </Svg>
        );
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
    onToggleCollapse,
    descendantCount,
    taskBlocked,
    holdProgress,
    gestureManaged,
  ]);

  const transparentBg =
    item.type === 'drawing' || item.type === 'shape' || item.type === 'region';

  const shellStyle = [
    styles.item,
    shadows.card,
    {
      backgroundColor: transparentBg
        ? 'transparent'
        : item.backgroundColor ?? colors.paper,
      borderColor: selected ? colors.selection : 'transparent',
      borderWidth: selected ? 2 : 0,
      overflow: selected ? ('visible' as const) : ('hidden' as const),
    },
    item.type === 'region' && styles.regionOuter,
  ];

  if (gestureManaged) {
    return <View style={shellStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={onLongPress}
      delayLongPress={420}
      style={shellStyle}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    height: '100%',
    borderRadius: radii.card,
    overflow: 'hidden',
    padding: 18,
  },
  text: {
    fontFamily: 'System',
  },
  image: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.mutedInk,
  },
  blockedHint: {
    color: colors.mutedInk,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  mindmap: {
    flex: 1,
    justifyContent: 'center',
  },
  mindmapNode: {
    borderWidth: 2,
    borderColor: colors.clayDeep,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.paperStrong,
  },
  mindmapText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  collapseBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  collapseText: {
    color: colors.mutedInk,
    fontWeight: '700',
    fontSize: 12,
  },
  regionOuter: {
    padding: 0,
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
});
