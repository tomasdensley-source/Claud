import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';

// Compact, top-anchored, auto-dismissing notification with an optional Undo —
// replaces the centered native Alert for anything that isn't a destructive
// confirmation (bug #17: notifications were centered and obtrusive).
export function Toast() {
  const { toast, dismissToast, undo } = useBoard();

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={styles.wrap}
      pointerEvents="box-none"
    >
      <Pressable style={[styles.pill, shadows.control]} onPress={dismissToast}>
        <Text style={styles.text} numberOfLines={2}>
          {toast.text}
        </Text>
        {toast.undoable ? (
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
