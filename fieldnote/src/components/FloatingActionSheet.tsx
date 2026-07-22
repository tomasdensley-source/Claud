import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

interface Props {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
  /** Screen anchor — sheet appears near this point when provided. */
  anchor?: { x: number; y: number };
}

/** Compact floating action sheet — replaces routine system Alerts. */
export function FloatingActionSheet({ visible, title, actions, onClose, anchor }: Props) {
  if (!visible) return null;

  const left = anchor ? Math.max(12, Math.min(anchor.x - 110, 400)) : undefined;
  const top = anchor ? Math.max(12, anchor.y - 8) : undefined;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          styles.card,
          shadows.control,
          anchor
            ? { position: 'absolute', left, top }
            : { alignSelf: 'center', marginTop: 120 },
        ]}
      >
        <View style={styles.head}>
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            accessibilityLabel="Close"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color={colors.cream} />
          </Pressable>
        </View>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            style={styles.row}
            onPress={() => {
              void hapticSelection();
              onClose();
              a.onPress();
            }}
          >
            <Text style={[styles.rowText, a.destructive && styles.destructive]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
  },
  card: {
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  title: {
    color: 'rgba(255,248,233,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  rowText: {
    color: colors.cream,
    fontSize: 15,
    fontWeight: '600',
  },
  destructive: {
    color: '#f0a0a0',
  },
});
