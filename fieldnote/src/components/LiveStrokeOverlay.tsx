import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  worldSize: number;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

function pointsToPath(points: { x: number; y: number }[], ox: number, oy: number): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x - ox).toFixed(1)} ${(p.y - oy).toFixed(1)}`)
    .join(' ');
}

let skiaModule: null | false | typeof import('@shopify/react-native-skia') = null;

function getSkia() {
  if (skiaModule === false) return null;
  if (skiaModule) return skiaModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    skiaModule = require('@shopify/react-native-skia');
    return skiaModule;
  } catch {
    skiaModule = false;
    return null;
  }
}

/**
 * Live stroke — tight bounds only (never a full-world 4000×4000 canvas).
 * Full-world Skia/SVG surfaces crash Android when the camera zooms.
 */
export function LiveStrokeOverlay({ color, width, points }: Props) {
  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = Math.max(24, width * 4);
    return {
      left: minX - pad,
      top: minY - pad,
      width: Math.max(48, maxX - minX + pad * 2),
      height: Math.max(48, maxY - minY + pad * 2),
      ox: minX - pad,
      oy: minY - pad,
    };
  }, [points, width]);

  const Skia = getSkia();

  const skPath = useMemo(() => {
    if (!Skia || !bounds || points.length === 0) return null;
    const path = Skia.Skia.Path.Make();
    points.forEach((p, i) => {
      const x = p.x - bounds.ox;
      const y = p.y - bounds.oy;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    return path;
  }, [Skia, bounds, points]);

  if (!bounds) return null;

  if (Skia && skPath) {
    const { Canvas, Path: SkPath } = Skia;
    return (
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <SkPath
            path={skPath}
            color={color}
            style="stroke"
            strokeWidth={width}
            strokeCap="round"
            strokeJoin="round"
          />
        </Canvas>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fill,
        { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
      ]}
    >
      <Svg width={bounds.width} height={bounds.height}>
        <Path
          d={pointsToPath(points, bounds.ox, bounds.oy)}
          stroke={color}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
  },
});
