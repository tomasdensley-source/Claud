import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

interface Props {
  width: number;
  onWidth: (w: number) => void;
}

/** Stroke width chips only — colors live on VerticalColorPalette. */
export function DrawPalette({ width, onWidth }: Props) {
  return (
    <View style={[styles.wrap, shadows.control]}>
      <View style={styles.row}>
        {[2, 4, 8].map((w) => (
          <Pressable
            key={w}
            onPress={() => {
              void hapticSelection();
              onWidth(w);
            }}
            style={[styles.widthBtn, width === w && styles.widthActive]}
            accessibilityLabel={`Stroke width ${w}`}
          >
            <View style={[styles.widthDot, { width: w + 4, height: w + 4, borderRadius: w }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 76,
    bottom: 18,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    padding: 8,
    gap: 8,
    zIndex: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widthBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthActive: {
    backgroundColor: 'rgba(203,125,70,0.54)',
  },
  widthDot: {
    backgroundColor: colors.cream,
  },
});
