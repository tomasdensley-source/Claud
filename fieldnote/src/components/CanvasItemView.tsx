import React, { memo, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, Line, Path, Rect as SvgRect } from 'react-native-svg';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';
import { SEED_IMAGES } from '../lib/seedImages';

interface Props {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  scale: number;
  lowDetail: boolean;
  dense: boolean;
  onSelect: () => void;
  onLongPress: () => void;
  onChangeText: (text: string) => void;
  onToggleTask: () => void;
  onEndEdit: () => void;
  onConnectorPress: () => void;
  onMindChild: () => void;
  onMindSibling: () => void;
  onMindCollapse: () => void;
  onMindTidy: () => void;
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function fileSize(size?: number) {
  if (!size) return null;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export const CanvasItemView = memo(function CanvasItemView({
  item,
  selected,
  editing,
  scale,
  lowDetail,
  dense,
  onSelect,
  onLongPress,
  onChangeText,
  onToggleTask,
  onEndEdit,
  onConnectorPress,
  onMindChild,
  onMindSibling,
  onMindCollapse,
  onMindTidy,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const handleSize = Math.max(12, 14 / Math.max(scale, 0.2));
  const showText = !lowDetail || editing;

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
                  textAlign: item.textAlign ?? 'left',
                },
              ]}
              placeholder="Write something..."
              placeholderTextColor={colors.mutedInk}
              maxFontSizeMultiplier={1.25}
            />
          );
        }
        return showText ? (
          <Text
            style={[
              styles.text,
              {
                color: item.color ?? colors.ink,
                fontSize: item.fontSize,
                fontWeight: item.fontWeight ?? '400',
                textAlign: item.textAlign ?? 'left',
              },
            ]}
            numberOfLines={lowDetail ? 2 : undefined}
            maxFontSizeMultiplier={1.25}
          >
            {item.text || 'Write something...'}
          </Text>
        ) : <View style={styles.detailHidden} />;
      case 'image': {
        const source = item.assetKey
          ? SEED_IMAGES[item.assetKey]
          : item.uri
            ? { uri: item.uri }
            : null;
        if (!source || imageFailed) {
          return (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackGlyph}>Image unavailable</Text>
              <Text style={styles.fallbackSub}>{item.alt ?? 'Tap Add to choose another image.'}</Text>
            </View>
          );
        }
        return <Image source={source} style={styles.image} resizeMode="cover" onError={() => setImageFailed(true)} accessibilityLabel={item.alt ?? 'Image'} />;
      }
      case 'task': {
        const blocked = item.state === 'blocked';
        const ready = item.state === 'ready';
        return (
          <Pressable style={styles.taskRow} onPress={onToggleTask} accessibilityLabel={`Task ${item.text}`}>
            <View style={[styles.checkbox, item.done && styles.checkboxDone, blocked && styles.checkboxBlocked]}>
              {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  style={[styles.taskText, item.done && styles.taskDone]}
                  maxFontSizeMultiplier={1.25}
                />
              ) : showText ? (
                <Text style={[styles.taskText, item.done && styles.taskDone, blocked && styles.taskBlocked]} numberOfLines={lowDetail ? 1 : 3}>
                  {item.text || 'New task'}
                </Text>
              ) : null}
              <Text style={[styles.taskMeta, ready && styles.readyText, item.done && styles.doneText]}>
                {item.done ? 'done' : blocked ? 'blocked' : 'ready'}
                {item.dependsOn.length ? ` · ${item.dependsOn.length} deps` : ''}
              </Text>
            </View>
          </Pressable>
        );
      }
      case 'mindmap':
        return (
          <View style={styles.mindmap}>
            <View style={[styles.mindmapHub, { borderColor: item.branchColor }]}>
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  style={styles.mindmapHubText}
                  maxFontSizeMultiplier={1.2}
                />
              ) : (
                <Text style={styles.mindmapHubText} numberOfLines={lowDetail ? 1 : 2}>
                  {showText ? item.text || 'Idea' : 'Idea'}
                </Text>
              )}
            </View>
            {selected ? (
              <View style={styles.mindmapActions}>
                <ActionChip label="+ child" onPress={onMindChild} />
                <ActionChip label="+ sibling" onPress={onMindSibling} />
                <ActionChip label={item.collapsed ? 'expand' : 'collapse'} onPress={onMindCollapse} />
                <ActionChip label="tidy" onPress={onMindTidy} />
              </View>
            ) : null}
          </View>
        );
      case 'region':
        return (
          <View style={[styles.region, { opacity: item.opacity ?? 0.2 }]}>
            <Svg style={StyleSheet.absoluteFill}>
              {Array.from({ length: 18 }).map((_, i) => (
                <Circle
                  key={i}
                  cx={18 + (i % 6) * 54}
                  cy={18 + Math.floor(i / 6) * 54}
                  r={2}
                  fill="rgba(52,38,29,0.18)"
                />
              ))}
            </Svg>
            <Text style={styles.regionLabel}>{item.label || 'Region'}</Text>
          </View>
        );
      case 'shape':
        return (
          <Svg width="100%" height="100%">
            {item.shape === 'ellipse' ? (
              <Ellipse cx="50%" cy="50%" rx="45%" ry="40%" stroke={colors.ink} strokeWidth={3} fill={item.backgroundColor ?? 'transparent'} />
            ) : item.shape === 'line' ? (
              <Line x1="8%" y1="50%" x2="92%" y2="50%" stroke={colors.ink} strokeWidth={4} strokeLinecap="round" />
            ) : (
              <SvgRect x="8%" y="12%" width="84%" height="76%" rx={12} stroke={colors.ink} strokeWidth={3} fill={item.backgroundColor ?? 'transparent'} />
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
        const size = fileSize(item.size);
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>File</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{[item.mimeType, size].filter(Boolean).join(' · ') || 'document'}</Text>
          </View>
        );
      }
      case 'folder':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>Folder</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{item.fileCount} files</Text>
          </View>
        );
      case 'audio':
      case 'pdf':
      case 'markdown':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>{item.type.toUpperCase()}</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{item.text ?? 'Stub card ready for future preview support'}</Text>
          </View>
        );
      default:
        return null;
    }
  }, [
    editing,
    imageFailed,
    item,
    lowDetail,
    onChangeText,
    onEndEdit,
    onMindChild,
    onMindCollapse,
    onMindSibling,
    onMindTidy,
    onToggleTask,
    showText,
    selected,
  ]);

  const transparentBg = item.type === 'drawing' || item.type === 'shape' || item.type === 'region';
  const selectedGlow = selected
    ? {
        shadowColor: colors.selection,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.46,
        shadowRadius: 12,
        elevation: 8,
      }
    : null;

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.item,
        !dense && item.type !== 'region' && shadows.card,
        dense && styles.denseShadow,
        selectedGlow,
        {
          opacity: pressed ? 0.86 : 1,
          backgroundColor: transparentBg ? 'transparent' : item.backgroundColor ?? colors.paper,
          borderColor: selected ? colors.selection : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
        item.type === 'region' && styles.regionOuter,
        item.locked && styles.locked,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.type} item${selected ? ', selected' : ''}`}
    >
      {content}
      {selected ? (
        <>
          <ConnectorDots size={handleSize} onPress={onConnectorPress} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, right: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, bottom: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, right: -handleSize / 2, bottom: -handleSize / 2 }]} />
        </>
      ) : null}
    </Pressable>
  );
});

function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionChip} accessibilityLabel={label}>
      <Text style={styles.actionChipText}>{label}</Text>
    </Pressable>
  );
}

function ConnectorDots({ size, onPress }: { size: number; onPress: () => void }) {
  const dot = { width: size, height: size, borderRadius: size / 2 };
  return (
    <>
      <Pressable style={[styles.connectorDot, dot, { left: -size / 2, top: '50%' }]} onPress={onPress} accessibilityLabel="Connect from left side" />
      <Pressable style={[styles.connectorDot, dot, { right: -size / 2, top: '50%' }]} onPress={onPress} accessibilityLabel="Connect from right side" />
      <Pressable style={[styles.connectorDot, dot, { top: -size / 2, left: '50%' }]} onPress={onPress} accessibilityLabel="Connect from top side" />
      <Pressable style={[styles.connectorDot, dot, { bottom: -size / 2, left: '50%' }]} onPress={onPress} accessibilityLabel="Connect from bottom side" />
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    height: '100%',
    borderRadius: radii.card,
    overflow: 'visible',
    padding: 18,
  },
  denseShadow: {
    elevation: 1,
  },
  locked: {
    borderStyle: 'dashed',
  },
  text: {
    fontFamily: 'System',
  },
  detailHidden: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(52,38,29,0.08)',
  },
  image: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: radii.card,
  },
  imageFallback: {
    flex: 1,
    backgroundColor: '#e8dcc8',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  fallbackGlyph: { color: colors.ink, fontWeight: '800' },
  fallbackSub: { color: colors.mutedInk, fontSize: 12, textAlign: 'center' },
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
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxBlocked: {
    borderColor: colors.blocked,
    backgroundColor: 'rgba(200,101,69,0.16)',
  },
  checkMark: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  taskText: {
    color: colors.ink,
    fontSize: 20,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.mutedInk,
  },
  taskBlocked: {
    color: colors.blocked,
  },
  taskMeta: {
    color: colors.blocked,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  readyText: { color: colors.ready },
  doneText: { color: colors.success },
  mindmap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mindmapHub: {
    backgroundColor: colors.paperStrong,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 3,
  },
  mindmapHubText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    minWidth: 80,
  },
  mindmapActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  actionChip: {
    backgroundColor: colors.walnut,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionChipText: {
    color: colors.cream,
    fontSize: 10,
    fontWeight: '700',
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
    overflow: 'hidden',
  },
  regionLabel: {
    color: colors.mutedInk,
    fontWeight: '800',
    fontSize: 16,
  },
  fileCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  fileGlyph: {
    color: colors.clayDeep,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fileName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  fileMeta: {
    color: colors.mutedInk,
    fontSize: 12,
  },
  handle: {
    position: 'absolute',
    backgroundColor: colors.paperStrong,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    zIndex: 5,
  },
  connectorDot: {
    position: 'absolute',
    backgroundColor: colors.selection,
    borderWidth: 2,
    borderColor: colors.walnut,
    zIndex: 6,
  },
});
