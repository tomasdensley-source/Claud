import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { FloatingActionSheet } from '../FloatingActionSheet';
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
    repairBoardLayout,
    setMindMapDepth,
    mindMapDepth,
    selectedIds,
  } = useBoard();
  const [confirmReset, setConfirmReset] = useState(false);

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
        icon="time-outline"
        title="Recovery snapshots"
        subtitle="Restore a recent board backup"
        onPress={() => setPanel('snapshots')}
      />
      <Row
        icon="construct-outline"
        title="Repair Map"
        subtitle="Normalize overlaps and tidy mind-map trees"
        onPress={() => {
          repairBoardLayout();
          onClose();
        }}
      />
      <Row
        icon="sparkles-outline"
        title="What's new in 1.6"
        subtitle="Pan, toolbar grip, double-tap note, side resize"
        onPress={() => setPanel('whatsNew')}
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
        onPress={() => setConfirmReset(true)}
      />
      <FloatingActionSheet
        visible={confirmReset}
        title="Reset Fieldnote?"
        actions={[
          {
            label: 'Reset to demo',
            destructive: true,
            onPress: () => {
              void resetToSeed().then(() => onClose());
            },
          },
        ]}
        onClose={() => setConfirmReset(false)}
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
          <Tip title="One finger empty" body="Pan the board (map-like). Turn on Multi for marquee." />
          <Tip title="Double-tap empty" body="Drop a Markdown note at that spot" />
          <Tip title="Pinch" body="Zoom about your fingers — no sideways jump" />
          <Tip title="One finger on a card" body="Move it; handles resize corners and sides" />
          <Tip title="Hold empty space" body="Compact add: Files / Device / New" />
          <Tip title="Toolbar grip" body="Drag the dotted bar to move the tool rail" />
          <Tip title="Multi tool" body="Marquee with one finger; two fingers to pan" />
          <Tip title="Lasso tool" body="Draw a freehand loop to select cards inside" />
        </View>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Board tips</Text>
          <Tip title="Working folder" body="Add → Working folder routes uploads into that card" />
          <Tip title="Repair Map" body="More → Repair Map untangles overlaps and mind maps" />
          <Tip title="Color tab" body="Opens only when drawing or selecting" />
          <Tip title="Frame / Body" body="Toggle what the palette recolors" />
          <Tip title="Fit" body="Frame every card on the board" />
          <Tip title="Undo toast" body="Top toast can undo the last change" />
          <Tip title="Draw" body="One finger inks; two fingers still navigate" />
        </View>
      </View>
      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerText}>
          Tip: One-finger pan is the default. Double-tap empty for a note. Drag the toolbar grip to move tools.
        </Text>
      </View>
    </ModalShell>
  );
}

export function StoragePanel({ visible, onClose }: Props) {
  const { boards, resetToSeed } = useBoard();
  const itemCount = boards.reduce((n, b) => n + b.items.length, 0);
  const [confirmClear, setConfirmClear] = useState(false);

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
      <Pressable style={styles.danger} onPress={() => setConfirmClear(true)}>
        <Text style={styles.dangerText}>Clear local data & restore demo</Text>
      </Pressable>
      <FloatingActionSheet
        visible={confirmClear}
        title="Clear all local boards?"
        actions={[
          {
            label: 'Clear & restore demo',
            destructive: true,
            onPress: () => {
              void resetToSeed().then(() => onClose());
            },
          },
        ]}
        onClose={() => setConfirmClear(false)}
      />
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
