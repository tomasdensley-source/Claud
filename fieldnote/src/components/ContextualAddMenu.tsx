import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

interface Props {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onInternal: () => void;
  onDevice: () => void;
  onNewObject: () => void;
}

/** Compact 3-button contextual add menu (blueprint). */
export function ContextualAddMenu({
  visible,
  x,
  y,
  onClose,
  onInternal,
  onDevice,
  onNewObject,
}: Props) {
  if (!visible) return null;

  const run = async (fn: () => void) => {
    await hapticSelection();
    fn();
  };

  return (
    <View
      style={[
        styles.wrap,
        shadows.control,
        {
          left: Math.max(8, x - 108),
          top: Math.max(8, y - 52),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <Pressable
          style={styles.btn}
          onPress={() => run(onInternal)}
          accessibilityLabel="Internal folders"
        >
          <Ionicons name="folder-outline" size={18} color={colors.cream} />
          <Text style={styles.label}>Files</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() => run(onDevice)}
          accessibilityLabel="Device capture"
        >
          <Ionicons name="phone-portrait-outline" size={18} color={colors.cream} />
          <Text style={styles.label}>Device</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() => run(onNewObject)}
          accessibilityLabel="New object"
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.cream} />
          <Text style={styles.label}>New</Text>
        </Pressable>
        <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close">
          <Ionicons name="close" size={16} color={colors.cream} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btn: {
    width: 64,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    color: 'rgba(255,250,240,0.88)',
    fontSize: 10,
    fontWeight: '700',
  },
  close: {
    width: 28,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
