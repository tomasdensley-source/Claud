import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, shadows } from '../theme';

const SWATCHES = ['#34261d', '#cb7d46', '#2f6fed', '#2f9e6b', '#c43c3c', '#ffffff'];

interface Props {
  color: string;
  width: number;
  onColor: (c: string) => void;
  onWidth: (w: number) => void;
}

export function DrawPalette({ color, width, onColor, onWidth }: Props) {
  return (
    <View style={[styles.wrap, shadows.control]}>
      <View style={styles.row}>
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: c === '#ffffff' ? '#ccc' : c },
              color === c && styles.swatchActive,
            ]}
            accessibilityLabel={`Draw color ${c}`}
          />
        ))}
      </View>
      <View style={styles.row}>
        {[2, 4, 8].map((w) => (
          <Pressable
            key={w}
            onPress={() => onWidth(w)}
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
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
  },
  swatchActive: {
    transform: [{ scale: 1.15 }],
    borderColor: colors.cream,
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
