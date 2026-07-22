import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const STEP = 80;
/** Cap line count — avoid huge display lists under Android zoom transforms. */
const MAX_LINES = 52;

interface Props {
  worldSize: number;
  fillColor?: string;
}

/**
 * Paper grid as thin Views (not a world-sized SVG bitmap).
 * Android crashes when a ~4000×4000 SVG/hardware layer is scaled.
 */
export function GridBackground({ worldSize, fillColor }: Props) {
  const lines = useMemo(() => {
    const step = Math.max(STEP, Math.ceil(worldSize / MAX_LINES));
    const coords: number[] = [];
    for (let v = 0; v <= worldSize + 0.5; v += step) coords.push(Math.min(worldSize, v));
    return coords;
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
      {lines.map((x) => (
        <View key={`v-${x}`} style={[styles.v, { left: x }]} />
      ))}
      {lines.map((y) => (
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
    overflow: 'hidden',
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
