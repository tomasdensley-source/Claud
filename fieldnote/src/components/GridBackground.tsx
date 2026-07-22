import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const STEP = 80;

interface Props {
  worldSize: number;
  fillColor?: string;
}

/** Subtle paper grid drawn once under board items. */
export function GridBackground({ worldSize, fillColor }: Props) {
  const lines = useMemo(() => {
    const count = Math.ceil(worldSize / STEP);
    const vertical = Array.from({ length: count + 1 }, (_, i) => i * STEP);
    const horizontal = vertical;
    return { vertical, horizontal };
  }, [worldSize]);

  return (
    <View
      style={[
        styles.root,
        {
          width: worldSize,
          height: worldSize,
          backgroundColor: fillColor ?? colors.canvas,
        },
      ]}
      pointerEvents="none"
    >
      {lines.vertical.map((x) => (
        <View key={`v-${x}`} style={[styles.v, { left: x }]} />
      ))}
      {lines.horizontal.map((y) => (
        <View key={`h-${y}`} style={[styles.h, { top: y }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  v: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.canvasGrid,
  },
  h: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.canvasGrid,
  },
});
