import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';

interface Props {
  message: string | null;
  onDone: () => void;
  onUndo?: () => void;
}

/** Top toast with Undo + dismiss (blueprint). */
export function Toast({ message, onDone, onUndo }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <View style={[styles.wrap, shadows.control]}>
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
      {onUndo ? (
        <Pressable onPress={onUndo} style={styles.undo} hitSlop={8}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onDone} style={styles.close} accessibilityLabel="Dismiss">
        <Ionicons name="close" size={16} color={colors.cream} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    maxWidth: '86%',
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 95,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
