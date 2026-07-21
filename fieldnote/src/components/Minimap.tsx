import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';

interface Props {
  items: BoardItem[];
  selectedIds: string[];
  viewport?: { centerX: number; centerY: number; width: number; height: number };
  onNavigate: (worldX: number, worldY: number) => void;
  onFit: () => void;
}

export function Minimap({ items, selectedIds, viewport, onNavigate, onFit }: Props) {
  const [size, setSize] = useState({ width: 104, height: 104 });
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

  const navigateAt = (locationX: number, locationY: number) => {
    const innerWidth = Math.max(1, size.width - 12);
    const innerHeight = Math.max(1, size.height - 12);
    const wx = layout.minX + (Math.max(0, Math.min(innerWidth, locationX - 6)) / innerWidth) * layout.w;
    const wy = layout.minY + (Math.max(0, Math.min(innerHeight, locationY - 6)) / innerHeight) * layout.h;
    onNavigate(wx, wy);
  };

  const renderedItems = items.slice(0, 160);

  return (
    <Pressable
      style={[styles.box, shadows.control]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setSize({ width, height });
      }}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        navigateAt(locationX, locationY);
      }}
      onMoveShouldSetResponder={() => true}
      onResponderMove={(e) => navigateAt(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      onLongPress={onFit}
      accessibilityLabel="Mini map. Tap to move the view; long press to fit the board"
    >
      <View style={styles.surface}>
        {renderedItems.map((it) => (
          <View
            key={it.id}
            style={[
              styles.dot,
              it.type === 'image' ? styles.imageDot : styles.textDot,
              selectedIds.includes(it.id) && styles.selectedDot,
              selectedIds.includes(it.id) && styles.selectionRing,
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
        {viewport ? (
          <View
            pointerEvents="none"
            style={[
              styles.viewport,
              {
                left: `${((viewport.centerX - viewport.width / 2 - layout.minX) / layout.w) * 100}%`,
                top: `${((viewport.centerY - viewport.height / 2 - layout.minY) / layout.h) * 100}%`,
                width: `${Math.max(8, (viewport.width / layout.w) * 100)}%`,
                height: `${Math.max(8, (viewport.height / layout.h) * 100)}%`,
              },
            ]}
          />
        ) : null}
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
    borderWidth: 2,
    borderColor: colors.selection,
  },
  selectionRing: {
    shadowColor: colors.selection,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  viewport: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.cream,
    backgroundColor: 'rgba(255,250,240,0.08)',
    borderRadius: 4,
  },
});
