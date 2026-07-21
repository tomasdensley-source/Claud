import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';

interface Props {
  items: BoardItem[];
  selectedIds: string[];
  onNavigate: (worldX: number, worldY: number) => void;
  onFit: () => void;
}

export function Minimap({ items, selectedIds, onNavigate, onFit }: Props) {
  const layout = useMemo(() => {
    if (items.length === 0) {
      return { minX: 0, minY: 0, w: 1000, h: 800 };
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
    const pad = 40;
    return {
      minX: minX - pad,
      minY: minY - pad,
      w: Math.max(200, maxX - minX + pad * 2),
      h: Math.max(200, maxY - minY + pad * 2),
    };
  }, [items]);

  return (
    <Pressable
      style={[styles.box, shadows.control]}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        const wx = layout.minX + (locationX / 104) * layout.w;
        const wy = layout.minY + (locationY / 104) * layout.h;
        onNavigate(wx, wy);
      }}
      onLongPress={onFit}
      accessibilityLabel="Mini map. Tap to move the view; long press to fit the board"
    >
      <View style={styles.surface}>
        {items.map((it) => (
          <View
            key={it.id}
            style={[
              styles.dot,
              it.type === 'image' ? styles.imageDot : styles.textDot,
              selectedIds.includes(it.id) && styles.selectedDot,
              {
                left: `${((it.x - layout.minX) / layout.w) * 100}%`,
                top: `${((it.y - layout.minY) / layout.h) * 100}%`,
                width: `${Math.max(4, (it.width / layout.w) * 100)}%`,
                height: `${Math.max(3, (it.height / layout.h) * 100)}%`,
                backgroundColor:
                  it.type === 'image'
                    ? '#8aa4b0'
                    : it.backgroundColor === '#E9B27F'
                      ? '#E9B27F'
                      : '#d9c6a8',
              },
            ]}
          />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    right: 12,
    top: 54,
    width: 104,
    height: 104,
    borderRadius: radii.control,
    backgroundColor: colors.walnut,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 6,
    zIndex: 40,
  },
  surface: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,250,240,0.08)',
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    borderRadius: 2,
  },
  textDot: {},
  imageDot: {},
  selectedDot: {
    borderWidth: 1,
    borderColor: colors.selection,
  },
});
