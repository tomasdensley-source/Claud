import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBoard } from '../store/BoardContext';
import { haptics } from '../lib/haptics';
import { colors, radii, shadows } from '../theme';

// A handful of preset swatches from Fieldnote's own palette, distinct from the
// 5 user-editable custom slots below them.
const PRESETS = [
  colors.paper,
  colors.clay,
  colors.amber,
  colors.tipBlue,
  colors.clayDeep,
  colors.ink,
  colors.walnut,
  colors.cream,
];

function Swatch({
  color,
  size = 26,
  onPress,
  onLongPress,
  empty,
}: {
  color?: string;
  size?: number;
  onPress: () => void;
  onLongPress?: () => void;
  empty?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.swatch,
        { width: size, height: size, borderRadius: size / 2 },
        empty ? styles.swatchEmpty : { backgroundColor: color },
      ]}
      accessibilityLabel={empty ? 'Empty custom slot' : `Color ${color}`}
    >
      {empty ? <Text style={styles.plus}>+</Text> : null}
    </Pressable>
  );
}

export function Palette() {
  const {
    paletteOpen,
    paletteTarget,
    paletteSlots,
    setPaletteTarget,
    setPaletteSlot,
    applyPaletteColor,
  } = useBoard();
  const [lastColor, setLastColor] = useState<string>(colors.clay);

  if (!paletteOpen) return null;

  const pick = (color: string) => {
    setLastColor(color);
    applyPaletteColor(color);
  };

  return (
    <View style={[styles.wrap, shadows.control]}>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, paletteTarget === 'frame' && styles.toggleBtnActive]}
          onPress={() => setPaletteTarget('frame')}
          accessibilityLabel="Color the frame"
        >
          <Text
            style={[styles.toggleText, paletteTarget === 'frame' && styles.toggleTextActive]}
          >
            Frame
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, paletteTarget === 'body' && styles.toggleBtnActive]}
          onPress={() => setPaletteTarget('body')}
          accessibilityLabel="Color the body"
        >
          <Text style={[styles.toggleText, paletteTarget === 'body' && styles.toggleTextActive]}>
            Body
          </Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {PRESETS.map((c) => (
          <Swatch key={c} color={c} onPress={() => pick(c)} />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.grid}>
        {paletteSlots.map((c, i) => (
          <Swatch
            key={i}
            color={c}
            empty={!c}
            onPress={() => c && pick(c)}
            onLongPress={() => {
              haptics.medium();
              setPaletteSlot(i, lastColor);
            }}
          />
        ))}
      </View>
      <Text style={styles.hint}>Hold a slot to save the last color used</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 76,
    top: 54,
    width: 160,
    backgroundColor: colors.walnut,
    borderRadius: radii.toolbar,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    padding: 10,
    gap: 10,
    zIndex: 39,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.control,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.control - 3,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(203,125,70,0.54)',
  },
  toggleText: {
    color: 'rgba(255,250,240,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: colors.cream,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  swatch: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmpty: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  plus: {
    color: 'rgba(255,250,240,0.6)',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: 'rgba(255,250,240,0.55)',
    fontSize: 10,
    lineHeight: 13,
  },
});
