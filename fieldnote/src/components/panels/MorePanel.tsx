import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MorePanel({ visible, onClose }: Props) {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    setPanel,
    resetToSeed,
    tidySelectedMindMap,
    setMindMapDepth,
    mindMapDepth,
    selectedIds,
  } = useBoard();

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Board controls"
      subtitle="History, export, mind maps, and storage."
      icon="ellipsis-horizontal"
    >
      <Row
        icon="arrow-undo-outline"
        title="Undo"
        disabled={!canUndo}
        onPress={() => {
          undo();
          onClose();
        }}
      />
      <Row
        icon="arrow-redo-outline"
        title="Redo"
        disabled={!canRedo}
        onPress={() => {
          redo();
          onClose();
        }}
      />
      <Row
        icon="locate-outline"
        title="Places"
        subtitle="Save and jump to landmarks on this board"
        onPress={() => setPanel('places')}
      />
      <Row
        icon="share-outline"
        title="Export JSON Canvas"
        subtitle="Share Obsidian-compatible .canvas"
        onPress={() => setPanel('export')}
      />
      <Row
        icon="sparkles-outline"
        title="Paste AI Board"
        subtitle="Import JSON from any LLM"
        onPress={() => setPanel('pasteAi')}
      />
      <Row
        icon="git-network-outline"
        title="Tidy mind map"
        subtitle={selectedIds.length ? 'Reflow selected mind-map root' : 'Select a mind-map node first'}
        disabled={selectedIds.length === 0}
        onPress={() => {
          tidySelectedMindMap();
          onClose();
        }}
      />
      <Row
        icon="layers-outline"
        title={`Mind-map depth: ${mindMapDepth === 'all' ? 'All' : mindMapDepth}`}
        subtitle="Tap to cycle 1 → 2 → 3 → 4 → All"
        onPress={() => {
          const order: Array<number | 'all'> = [1, 2, 3, 4, 'all'];
          const idx = order.indexOf(mindMapDepth);
          setMindMapDepth(order[(idx + 1) % order.length]);
        }}
      />
      <Row
        icon="help-circle-outline"
        title="Gestures & shortcuts"
        onPress={() => setPanel('gestures')}
      />
      <Row
        icon="shield-checkmark-outline"
        title="Storage & safety"
        onPress={() => setPanel('storage')}
      />
      <Row
        icon="refresh-outline"
        title="Reset to demo board"
        subtitle="Clears local boards and restores seed content"
        onPress={() => {
          Alert.alert('Reset Fieldnote?', 'This replaces saved boards with the demo board.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                await resetToSeed();
                onClose();
              },
            },
          ]);
        }}
      />
    </ModalShell>
  );
}

export function GesturesPanel({ visible, onClose }: Props) {
  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      eyebrow="QUICK REFERENCE"
      title="Move through Fieldnote"
      icon="help-circle-outline"
      wide
    >
      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={styles.colTitle}>On your phone</Text>
          <Tip title="Two fingers" body="Always pan and pinch — zoom from 2% to 6400%" />
          <Tip title="One finger empty" body="Drag a marquee to select" />
          <Tip title="One finger on a card" body="Move or resize that object" />
          <Tip title="Hold empty space" body="Compact add: Files / Device / New" />
          <Tip title="Hold a title" body="Edit after the confirm pulse" />
          <Tip title="Multi + marquee" body="Add to the current selection" />
        </View>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Board tips</Text>
          <Tip title="Color tab" body="Opens only when drawing or selecting" />
          <Tip title="Frame / Body" body="Toggle what the palette recolors" />
          <Tip title="Fit" body="Frame every card on the board" />
          <Tip title="Undo toast" body="Top toast can undo the last change" />
          <Tip title="Draw" body="One finger inks; two fingers still navigate" />
          <Tip title="Bring forward" body="Selection bar arrows change stack order" />
        </View>
      </View>
      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerText}>
          Tip: Navigation is always two-finger. Long-press empty space for the compact add menu.
        </Text>
      </View>
    </ModalShell>
  );
}

export function StoragePanel({ visible, onClose }: Props) {
  const { boards, resetToSeed } = useBoard();
  const itemCount = boards.reduce((n, b) => n + b.items.length, 0);

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Storage & safety"
      subtitle="Fieldnote keeps your work on this device."
      icon="shield-checkmark-outline"
    >
      <View style={styles.statCard}>
        <Text style={styles.stat}>{boards.length} boards</Text>
        <Text style={styles.statSub}>{itemCount} cards & files stored locally</Text>
      </View>
      <Text style={styles.body}>
        Waiting before editing protects your saved work. Boards autosave as you move and write.
        Clearing app data or uninstalling removes local boards.
      </Text>
      <Pressable
        style={styles.danger}
        onPress={() => {
          Alert.alert('Clear all local boards?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear',
              style: 'destructive',
              onPress: async () => {
                await resetToSeed();
                onClose();
              },
            },
          ]);
        }}
      >
        <Text style={styles.dangerText}>Clear local data & restore demo</Text>
      </Pressable>
    </ModalShell>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedInk} />
    </Pressable>
  );
}

function Tip({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipTitle}>{title}</Text>
      <Text style={styles.tipBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
  },
  rowTitle: { color: colors.ink, fontWeight: '700' },
  rowSub: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
  columns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 140, gap: 8 },
  colTitle: { color: colors.ink, fontWeight: '800', marginBottom: 4 },
  tip: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    padding: 10,
  },
  tipTitle: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  tipBody: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
  tipBanner: {
    backgroundColor: colors.tipBlue,
    borderRadius: 12,
    padding: 12,
  },
  tipBannerText: { color: colors.ink, fontWeight: '600' },
  statCard: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    padding: 14,
  },
  stat: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  statSub: { color: colors.mutedInk, marginTop: 4 },
  body: { color: colors.mutedInk, lineHeight: 20 },
  danger: {
    backgroundColor: '#3a221c',
    borderRadius: radii.control,
    padding: 14,
    alignItems: 'center',
  },
  dangerText: { color: colors.cream, fontWeight: '700' },
});
