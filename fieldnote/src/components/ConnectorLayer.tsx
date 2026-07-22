import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Line } from 'react-native-svg';
import { runOnJS } from 'react-native-reanimated';
import { BoardItem, ConnectorItem } from '../types';
import { colors } from '../theme';
import { GESTURE } from '../lib/gesturePriority';

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

/**
 * Per-edge SVG (tight bounds) — avoids one giant 4000×4000 Android bitmap
 * that crashes when the world layer is scaled.
 */
function ConnectorEdge({
  edge,
  from,
  to,
  onLongPress,
}: {
  edge: ConnectorItem;
  from: BoardItem;
  to: BoardItem;
  onLongPress?: (id: string) => void;
}) {
  const a = anchorPoint(from, edge.fromSide);
  const b = anchorPoint(to, edge.toSide);
  const pad = 24;
  const minX = Math.min(a.x, b.x) - pad;
  const minY = Math.min(a.y, b.y) - pad;
  const width = Math.max(48, Math.abs(b.x - a.x) + pad * 2);
  const height = Math.max(48, Math.abs(b.y - a.y) + pad * 2);
  const stroke = edge.glowing ? colors.amber : edge.color ?? colors.ink;
  const strokeWidth = edge.glowing ? (edge.thickness ?? 2) + 1.5 : edge.thickness ?? 2;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;

  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(GESTURE.LONG_PRESS_MS)
        .maxDistance(18)
        .enabled(!!onLongPress)
        .onEnd((_e, success) => {
          'worklet';
          if (success && onLongPress) runOnJS(onLongPress)(edge.id);
        }),
    [edge.id, onLongPress],
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width,
        height,
        zIndex: 40,
      }}
    >
      <Svg width={width} height={height} pointerEvents="none">
        <Line
          x1={a.x - minX}
          y1={a.y - minY}
          x2={b.x - minX}
          y2={b.y - minY}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={edge.glowing ? 1 : 0.75}
        />
        <Circle
          cx={a.x - minX}
          cy={a.y - minY}
          r={5}
          fill={colors.paperStrong}
          stroke={stroke}
          strokeWidth={2}
        />
        <Circle
          cx={b.x - minX}
          cy={b.y - minY}
          r={5}
          fill={colors.paperStrong}
          stroke={stroke}
          strokeWidth={2}
        />
      </Svg>
      {onLongPress ? (
        <GestureDetector gesture={gesture}>
          <View
            collapsable={false}
            accessibilityLabel="Edit connector"
            style={[
              styles.hit,
              {
                left: midX - minX - 18,
                top: midY - minY - 18,
              },
            ]}
          />
        </GestureDetector>
      ) : null}
    </View>
  );
}

export function ConnectorLayer({ items, onLongPressConnector }: Props) {
  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const connectors = items.filter((it): it is ConnectorItem => it.type === 'connector');

  if (connectors.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {connectors.map((edge) => {
        const from = byId.get(edge.fromId);
        const to = byId.get(edge.toId);
        if (!from || !to || from.type === 'connector' || to.type === 'connector') return null;
        return (
          <ConnectorEdge
            key={edge.id}
            edge={edge}
            from={from}
            to={to}
            onLongPress={onLongPressConnector}
          />
        );
      })}
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
