import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import {
  ColorTarget,
  DEFAULT_SWATCHES,
  loadPaletteFolded,
  loadSwatches,
  rememberSwatch,
  savePaletteFolded,
  saveSwatches,
} from '../lib/colorManager';
import { hapticSelection } from '../lib/haptics';

interface Props {
  lit: boolean;
  color: string;
  target: ColorTarget;
  onColor: (color: string) => void;
  onTarget: (target: ColorTarget) => void;
}

/** Vertical color palette — folded by default; opens only when lit/relevant. */
export function VerticalColorPalette({ lit, color, target, onColor, onTarget }: Props) {
  const [folded, setFolded] = useState(true);
  const [swatches, setSwatches] = useState(DEFAULT_SWATCHES);

  useEffect(() => {
    void (async () => {
      setSwatches(await loadSwatches());
      setFolded(await loadPaletteFolded());
    })();
  }, []);

  useEffect(() => {
    if (!lit && !folded) {
      setFolded(true);
      void savePaletteFolded(true);
    }
  }, [lit, folded]);

  const toggle = async () => {
    if (!lit && folded) return;
    await hapticSelection();
    const next = !folded;
    setFolded(next);
    await savePaletteFolded(next);
  };

  const pick = async (c: string) => {
    await hapticSelection();
    onColor(c);
    const next = rememberSwatch(swatches, c);
    setSwatches(next);
    await saveSwatches(next);
  };

  return (
    <View style={[styles.wrap, shadows.control]} pointerEvents="box-none">
      <Pressable
        style={[styles.tab, lit && styles.tabLit]}
        onPress={toggle}
        accessibilityLabel={folded ? 'Open color palette' : 'Close color palette'}
      >
        <Ionicons
          name={folded ? 'chevron-forward' : 'chevron-back'}
          size={14}
          color={colors.cream}
        />
        <View style={[styles.preview, { backgroundColor: color }]} />
      </Pressable>
      {!folded && lit ? (
        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggle, target === 'frame' && styles.toggleOn]}
              onPress={() => onTarget('frame')}
            >
              <Text style={styles.toggleText}>Frame</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, target === 'body' && styles.toggleOn]}
              onPress={() => onTarget('body')}
            >
              <Text style={styles.toggleText}>Body</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {swatches.map((c) => (
              <Pressable
                key={c}
                onPress={() => pick(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c, borderColor: c === '#ffffff' ? '#ccc' : c },
                  color.toLowerCase() === c.toLowerCase() && styles.swatchActive,
                ]}
                accessibilityLabel={`Color ${c}`}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 72,
    top: 120,
    zIndex: 45,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tab: {
    width: 34,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.walnut,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    opacity: 0.55,
  },
  tabLit: {
    opacity: 1,
    backgroundColor: colors.walnutRaised,
  },
  preview: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  panel: {
    marginLeft: 6,
    width: 52,
    maxHeight: 280,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  toggleRow: {
    gap: 4,
  },
  toggle: {
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: 'rgba(203,125,70,0.54)',
  },
  toggleText: {
    color: colors.cream,
    fontSize: 9,
    fontWeight: '700',
  },
  scroll: {
    maxHeight: 220,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 8,
    alignSelf: 'center',
  },
  swatchActive: {
    transform: [{ scale: 1.12 }],
    borderColor: colors.cream,
  },
});
