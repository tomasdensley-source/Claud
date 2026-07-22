import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line } from 'react-native-svg';
import { BoardItem, ConnectorItem } from '../types';
import { colors } from '../theme';
import { GESTURE } from '../lib/gesturePriority';
import { runOnJS } from 'react-native-reanimated';

interface Props {
  items: BoardItem[];
  worldSize: number;
  onLongPressConnector?: (id: string) => void;
}

function anchorPoint(
  item: BoardItem,
  side: ConnectorItem['fromSide'] = 'center',
): { x: number; y: number } {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  switch (side) {
    case 'left':
      return { x: item.x, y: cy };
    case 'right':
      return { x: item.x + item.width, y: cy };
    case 'top':
      return { x: cx, y: item.y };
    case 'bottom':
      return { x: cx, y: item.y + item.height };
    default:
      return { x: cx, y: cy };
  }
}

function ConnectorHit({
  id,
  x,
  y,
  onLongPress,
}: {
  id: string;
  x: number;
  y: number;
  onLongPress?: (id: string) => void;
}) {
  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(GESTURE.LONG_PRESS_MS)
        .maxDistance(18)
        .onEnd((_e, success) => {
          'worklet';
          if (success && onLongPress) runOnJS(onLongPress)(id);
        }),
    [id, onLongPress],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        accessibilityLabel="Edit connector"
        style={[styles.hit, { left: x - 18, top: y - 18 }]}
      />
    </GestureDetector>
  );
}

export function ConnectorLayer({ items, worldSize, onLongPressConnector }: Props) {
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const connectors = items.filter((it): it is ConnectorItem => it.type === 'connector');

  if (connectors.length === 0) return null;

  const hits = connectors
    .map((edge) => {
      const from = byId.get(edge.fromId);
      const to = byId.get(edge.toId);
      if (!from || !to || from.type === 'connector' || to.type === 'connector') return null;
      const a = anchorPoint(from, edge.fromSide);
      const b = anchorPoint(to, edge.toSide);
      return {
        id: edge.id,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
    })
    .filter(Boolean) as { id: string; midX: number; midY: number }[];

  return (
    <View style={[StyleSheet.absoluteFill, { width: worldSize, height: worldSize }]} pointerEvents="box-none">
      <Svg
        width={worldSize}
        height={worldSize}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {connectors.map((edge) => {
          const from = byId.get(edge.fromId);
          const to = byId.get(edge.toId);
          if (!from || !to || from.type === 'connector' || to.type === 'connector') return null;
          const a = anchorPoint(from, edge.fromSide);
          const b = anchorPoint(to, edge.toSide);
          const stroke = edge.glowing ? colors.amber : edge.color ?? colors.ink;
          const width = edge.glowing ? (edge.thickness ?? 2) + 1.5 : edge.thickness ?? 2;
          return (
            <React.Fragment key={edge.id}>
              <Line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={width}
                strokeLinecap="round"
                opacity={edge.glowing ? 1 : 0.75}
              />
              <Circle cx={a.x} cy={a.y} r={5} fill={colors.paperStrong} stroke={stroke} strokeWidth={2} />
              <Circle cx={b.x} cy={b.y} r={5} fill={colors.paperStrong} stroke={stroke} strokeWidth={2} />
            </React.Fragment>
          );
        })}
      </Svg>
      {onLongPressConnector
        ? hits.map((h) => (
            <ConnectorHit
              key={h.id}
              id={h.id}
              x={h.midX}
              y={h.midY}
              onLongPress={onLongPressConnector}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: 50,
  },
});
