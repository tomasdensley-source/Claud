import React, { useMemo } from 'react';
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
}: Props) {
  const handleSize = Math.max(10, 12 / scale);

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
          <Pressable style={styles.taskRow} onPress={onToggleTask}>
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
            ) : (
              <Text
                style={[
                  styles.taskText,
                  item.color ? { color: item.color } : null,
                  item.done && styles.taskDone,
                ]}
              >
                {item.text || 'New task'}
              </Text>
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
  }, [editing, item, onChangeText, onEndEdit, onToggleTask]);

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
      {content}
      {selected ? (
        <>
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, right: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, bottom: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, right: -handleSize / 2, bottom: -handleSize / 2 }]} />
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    borderRadius: radii.card,
    overflow: 'hidden',
    padding: 18,
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
  handle: {
    position: 'absolute',
    backgroundColor: colors.paperStrong,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
  },
});
