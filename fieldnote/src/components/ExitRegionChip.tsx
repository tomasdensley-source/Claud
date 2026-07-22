import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { useChromeSlot } from '../chrome/ChromeLayoutContext';
import { colors, radii, shadows } from '../theme';

interface Props {
  onExit?: () => void;
}

/** Exit-region chip — chrome slot (Batch 5), not hard-coded on canvas. */
export function ExitRegionChip({ onExit }: Props) {
  const { focusedRegionId, currentBoard, exitRegion } = useBoard();
  const region = useMemo(() => {
    if (!focusedRegionId) return null;
    return currentBoard.items.find((it) => it.id === focusedRegionId && it.type === 'region') ?? null;
  }, [currentBoard.items, focusedRegionId]);

  const visible = region != null;
  const preferred = useMemo(() => ({ x: 16, y: 56, width: 160, height: 40 }), []);
  const slot = useChromeSlot('exitRegion', preferred, visible);

  if (!visible || !region || !slot) return null;

  return (
    <Pressable
      style={[
        styles.chip,
        shadows.control,
        { left: slot.left, top: slot.top },
      ]}
      onPress={() => {
        exitRegion();
        onExit?.();
      }}
      accessibilityLabel={`Exit ${region.type === 'region' ? region.label || 'region' : 'region'}`}
    >
      <Ionicons name="arrow-back" size={16} color={colors.cream} />
      <Text style={styles.text} numberOfLines={1}>
        {region.type === 'region' ? region.label || 'Region' : 'Region'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    zIndex: 55,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.walnut,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 180,
  },
  text: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
});
