import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows } from '../theme';

interface Props {
  message: string | null;
  onDone: () => void;
}

export function Toast({ message, onDone }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <View style={[styles.wrap, shadows.control]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 72,
    right: 72,
    bottom: 92,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  text: {
    color: colors.cream,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
  },
});
