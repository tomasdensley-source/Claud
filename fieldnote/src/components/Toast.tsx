import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useBoard, ToastState } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';

// Compact, top-anchored, auto-dismissing notification with an optional Undo —
// replaces the centered native Alert for anything that isn't a destructive
// confirmation (bug #17: notifications were centered and obtrusive).
//
// Animates with a plain shared-value fade (useAnimatedStyle + withTiming),
// not Reanimated's entering/exiting Layout Animation props — that API has
// been a known source of native crashes on Android in early Reanimated 4.x
// releases, and this was the only place in the app that used it. `rendered`
// keeps the last toast on screen for the fade-out's duration, since without
// entering/exiting the component would otherwise unmount instantly.
export function Toast() {
  const { toast, dismissToast, undo } = useBoard();
  const [rendered, setRendered] = useState<ToastState | null>(toast);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      setRendered(toast);
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      opacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(setRendered)(null);
      });
    }
  }, [toast, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!rendered) return null;

  return (
    <Animated.View style={[styles.wrap, animatedStyle]} pointerEvents="box-none">
      <Pressable style={[styles.pill, shadows.control]} onPress={dismissToast}>
        <Text style={styles.text} numberOfLines={2}>
          {rendered.text}
        </Text>
        {rendered.undoable ? (
          <Pressable
            onPress={() => {
              undo();
              dismissToast();
            }}
            hitSlop={8}
          >
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.walnut,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
    maxWidth: '86%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  text: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  undo: {
    color: colors.amber,
    fontSize: 13,
    fontWeight: '800',
  },
});
