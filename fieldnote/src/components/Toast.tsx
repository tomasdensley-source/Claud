import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChromeLayout, useChromeSlot } from '../chrome/ChromeLayoutContext';
import { colors, radii, shadows } from '../theme';

interface Props {
  message: string | null;
  onDone: () => void;
  onUndo?: () => void;
}

const TOAST_W = 280;
const TOAST_H = 44;
const AUTO_MS = 2800;

/** Top toast with Undo + dismiss (blueprint). */
export function Toast({ message, onDone, onUndo }: Props) {
  const { viewport, insets } = useChromeLayout();
  const preferred = React.useMemo(
    () => ({
      x: Math.max(16, (viewport.width - TOAST_W) / 2),
      y: Math.max(12, insets.top + 8),
      width: TOAST_W,
      height: TOAST_H,
    }),
    [viewport.width, insets.top],
  );
  const visible = Boolean(message);
  const slot = useChromeSlot('toast', preferred, visible);
  const paused = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!message) return;
    paused.current = false;
    setTick((n) => n + 1);
  }, [message]);

  useEffect(() => {
    if (!message) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (paused.current) {
          arm();
          return;
        }
        onDone();
      }, AUTO_MS);
    };
    arm();
    return () => {
      if (t) clearTimeout(t);
    };
  }, [message, onDone, tick]);

  if (!message) return null;

  const top = slot?.top ?? preferred.y;
  const left = slot?.left ?? preferred.x;

  return (
    <View style={[styles.wrap, shadows.control, { top, left }]}>
      <Pressable
        style={styles.inner}
        onPressIn={() => {
          paused.current = true;
        }}
        onPressOut={() => {
          paused.current = false;
          setTick((n) => n + 1);
        }}
      >
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
        {onUndo ? (
          <Pressable
            onPress={() => {
              onUndo();
              onDone();
            }}
            style={styles.undo}
            hitSlop={8}
          >
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onDone} style={styles.close} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={16} color={colors.cream} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    maxWidth: '86%',
    minWidth: 180,
    zIndex: 95,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.control,
    backgroundColor: colors.walnut,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  text: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  undo: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  undoText: {
    color: colors.clay,
    fontWeight: '700',
    fontSize: 13,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
