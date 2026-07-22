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
import { formatFileSize, isPdfAsset } from '../lib/pdf';
import { hapticSelection } from '../lib/haptics';

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
  onOpenPdf?: () => void;
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
  onOpenPdf,
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
        return (
          <Image
            source={source}
            style={styles.image}
            resizeMode="cover"
            // Android: prevent decode/draw of oversized bitmaps under camera zoom.
            resizeMethod="resize"
          />
        );
      }
      case 'task': {
        const glow = item.done ? 1 : Math.max(0, Math.min(1, holdProgress));
        const glowBg = item.done
          ? 'rgba(47,158,107,0.22)'
          : `rgba(237,182,74,${0.08 + glow * 0.72})`;
        const glowBorder = item.done
          ? 'rgba(47,158,107,0.55)'
          : `rgba(203,125,70,${0.15 + glow * 0.85})`;
        const taskBody =
          !editing && (item.markdown || looksLikeMarkdown(item.text || '')) ? (
            <MarkdownView source={item.text || ''} color={colors.ink} fontSize={16} />
          ) : (
            <Text style={[styles.taskText, item.done && styles.taskDone]}>
              {item.text || 'New task'}
            </Text>
          );
        return (
          <View
            style={[
              styles.taskRow,
              {
                backgroundColor: glowBg,
                borderColor: glowBorder,
                borderWidth: 2,
                borderRadius: 14,
                padding: 8,
                // Soft “light stays on” once complete.
                shadowColor: item.done ? '#2f9e6b' : '#cb7d46',
                shadowOpacity: item.done ? 0.35 : 0.15 + glow * 0.45,
                shadowRadius: item.done ? 14 : 6 + glow * 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: item.done ? 6 : Math.round(glow * 8),
              },
            ]}
            pointerEvents={gestureManaged ? 'none' : 'auto'}
            onStartShouldSetResponder={gestureManaged ? undefined : () => true}
            onResponderGrant={gestureManaged ? undefined : startHold}
            onResponderRelease={gestureManaged ? undefined : stopHold}
            onResponderTerminate={gestureManaged ? undefined : stopHold}
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
                  <Text style={styles.blockedHint}>
                    {glow > 0.02 ? `Hold… ${Math.round(glow * 100)}%` : 'Hold 3s to complete'}
                  </Text>
                ) : (
                  <Text style={styles.blockedHint}>Complete</Text>
                )}
              </View>
            )}
          </View>
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
                stroke={item.color ?? colors.ink}
                strokeWidth={3}
                fill={item.backgroundColor ?? 'transparent'}
              />
            ) : item.shape === 'line' ? (
              <Line
                x1="8%"
                y1="50%"
                x2="92%"
                y2="50%"
                stroke={item.color ?? colors.ink}
                strokeWidth={4}
              />
            ) : (
              <SvgRect
                x="8%"
                y="12%"
                width="84%"
                height="76%"
                rx={12}
                stroke={item.color ?? colors.ink}
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
      case 'file': {
        const pdf = isPdfAsset(item.name, item.mimeType);
        if (pdf) {
          return (
            <View style={styles.pdfCover}>
              <View style={styles.pdfSpine} />
              <View style={styles.pdfBody}>
                <Text style={styles.pdfBadge}>PDF</Text>
                <Text style={styles.fileName} numberOfLines={3}>
                  {item.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {item.pageCount ? `~${item.pageCount} pages` : 'Document'}
                  {item.sizeBytes ? ` · ${formatFileSize(item.sizeBytes)}` : ''}
                </Text>
                <Pressable
                  style={styles.pdfOpen}
                  onPress={() => {
                    void hapticSelection();
                    onOpenPdf?.();
                  }}
                  pointerEvents="auto"
                  hitSlop={8}
                >
                  <Text style={styles.pdfOpenText}>Open</Text>
                </Pressable>
              </View>
            </View>
          );
        }
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>📄</Text>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        );
      }
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
    onOpenPdf,
  ]);

  const transparentBg =
    item.type === 'drawing' || item.type === 'shape' || item.type === 'region';

  const shellStyle = [
    styles.item,
    selected ? shadows.card : styles.restShadow,
    {
      backgroundColor: transparentBg
        ? 'transparent'
        : item.backgroundColor ?? colors.paper,
      borderColor: selected ? colors.selection : 'transparent',
      borderWidth: selected ? 1.5 : 0,
      overflow: 'hidden' as const,
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
  restShadow: {
    shadowColor: '#3d2a18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
  pdfCover: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.paperStrong,
  },
  pdfSpine: {
    width: 14,
    backgroundColor: colors.clayDeep,
  },
  pdfBody: {
    flex: 1,
    padding: 12,
    gap: 6,
    justifyContent: 'center',
  },
  pdfBadge: {
    alignSelf: 'flex-start',
    color: colors.cream,
    backgroundColor: colors.walnut,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pdfOpen: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.clayDeep,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pdfOpenText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
});
