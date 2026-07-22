import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  worldSize: number;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
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

/** Live stroke overlay — Skia when linked, SVG fallback otherwise. */
export function LiveStrokeOverlay({ worldSize, color, width, points }: Props) {
  const Skia = getSkia();

  const skPath = useMemo(() => {
    if (!Skia || points.length === 0) return null;
    const path = Skia.Skia.Path.Make();
    points.forEach((p, i) => {
      if (i === 0) path.moveTo(p.x, p.y);
      else path.lineTo(p.x, p.y);
    });
    return path;
  }, [Skia, points]);

  if (Skia && skPath) {
    const { Canvas, Path: SkPath } = Skia;
    return (
      <View pointerEvents="none" style={[styles.fill, { width: worldSize, height: worldSize }]}>
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
    <View pointerEvents="none" style={[styles.fill, { width: worldSize, height: worldSize }]}>
      <Svg width={worldSize} height={worldSize}>
        <Path
          d={pointsToPath(points)}
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
    left: 0,
    top: 0,
  },
});
