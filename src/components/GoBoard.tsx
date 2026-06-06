import React, { useMemo } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Rect, Line, Circle, G } from 'react-native-svg';
import { GoGame, BLACK, EMPTY } from '../game/GoGame';
import { theme } from '../theme';

interface Props {
  game: GoGame;
  size: number; // pixel size of the board square
  /** version counter — bump to force re-render after a mutation on `game` */
  version: number;
  onPlay: (x: number, y: number) => void;
}

/** Hoshi (star point) coordinates for the standard board sizes. */
function starPoints(n: number): Array<[number, number]> {
  if (n === 9) {
    return [
      [2, 2], [6, 2], [4, 4], [2, 6], [6, 6],
    ];
  }
  if (n === 13) {
    return [
      [3, 3], [9, 3], [6, 6], [3, 9], [9, 9],
    ];
  }
  // 19x19
  const e = 3;
  const m = 9;
  const f = 15;
  return [
    [e, e], [m, e], [f, e],
    [e, m], [m, m], [f, m],
    [e, f], [m, f], [f, f],
  ];
}

export default function GoBoard({ game, size, version, onPlay }: Props) {
  const n = game.size;
  // Margin leaves room for the outermost stones to sit fully on the wood.
  const margin = size / (n + 1);
  const gridSpan = size - margin * 2;
  const step = gridSpan / (n - 1);

  const coordToPx = (i: number) => margin + i * step;

  const stars = useMemo(() => starPoints(n), [n]);

  // Re-read board cells each render; `version` ensures React re-renders.
  void version;

  const handlePress = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const gx = Math.round((locationX - margin) / step);
    const gy = Math.round((locationY - margin) / step);
    if (gx < 0 || gy < 0 || gx >= n || gy >= n) return;
    // Reject taps that land too far from an intersection (in the gutter).
    const dx = Math.abs(locationX - coordToPx(gx));
    const dy = Math.abs(locationY - coordToPx(gy));
    if (dx > step * 0.5 || dy > step * 0.5) return;
    onPlay(gx, gy);
  };

  const stoneRadius = step * 0.46;

  const lines = [];
  for (let i = 0; i < n; i++) {
    const p = coordToPx(i);
    lines.push(
      <Line
        key={`h${i}`}
        x1={coordToPx(0)}
        y1={p}
        x2={coordToPx(n - 1)}
        y2={p}
        stroke={theme.colors.line}
        strokeWidth={1}
      />
    );
    lines.push(
      <Line
        key={`v${i}`}
        x1={p}
        y1={coordToPx(0)}
        x2={p}
        y2={coordToPx(n - 1)}
        stroke={theme.colors.line}
        strokeWidth={1}
      />
    );
  }

  const stones = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = game.get(x, y);
      if (v === EMPTY) continue;
      const cx = coordToPx(x);
      const cy = coordToPx(y);
      const isBlack = v === BLACK;
      stones.push(
        <G key={`s${x}-${y}`}>
          <Circle
            cx={cx + stoneRadius * 0.12}
            cy={cy + stoneRadius * 0.12}
            r={stoneRadius}
            fill="rgba(0,0,0,0.25)"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={stoneRadius}
            fill={isBlack ? theme.colors.black : theme.colors.white}
            stroke={isBlack ? '#000' : theme.colors.whiteShadow}
            strokeWidth={0.5}
          />
          <Circle
            cx={cx - stoneRadius * 0.3}
            cy={cy - stoneRadius * 0.3}
            r={stoneRadius * 0.35}
            fill={isBlack ? theme.colors.blackHi : '#ffffff'}
            opacity={isBlack ? 0.45 : 0.7}
          />
        </G>
      );
    }
  }

  const last = game.lastMove;

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handlePress}
    >
      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} rx={6} fill={theme.colors.board} />
        <Rect
          x={1}
          y={1}
          width={size - 2}
          height={size - 2}
          rx={6}
          fill="none"
          stroke={theme.colors.boardEdge}
          strokeWidth={2}
        />
        {lines}
        {stars.map(([sx, sy], i) => (
          <Circle
            key={`star${i}`}
            cx={coordToPx(sx)}
            cy={coordToPx(sy)}
            r={Math.max(2, step * 0.08)}
            fill={theme.colors.star}
          />
        ))}
        {stones}
        {last && (
          <Circle
            cx={coordToPx(last.x)}
            cy={coordToPx(last.y)}
            r={stoneRadius * 0.4}
            fill="none"
            stroke={theme.colors.lastMove}
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
