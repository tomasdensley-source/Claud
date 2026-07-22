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
  const { undo, redo, canUndo, canRedo, setPanel, resetToSeed } = useBoard();

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Board controls"
      subtitle="History, gestures, and storage."
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
        icon="grid-outline"
        title="Edit regions"
        subtitle="Regions group space on the board"
        onPress={() => {
          setPanel('add');
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
          <Tip title="Tap a card" body="Select without opening the keyboard" />
          <Tip title="Hold a title" body="Edit after the confirm pulse" />
          <Tip title="Drag empty space" body="Move around the canvas" />
          <Tip title="Pinch" body="Zoom in or out" />
          <Tip title="Hold empty space" body="Add files, photos, or a note at that spot" />
          <Tip title="Multi button" body="Select several cards, then drag as a group" />
          <Tip title="Corner handle" body="Drag the clay handle to resize" />
          <Tip title="Zoom + / −" body="Zooms toward the center of the screen" />
        </View>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Board tips</Text>
          <Tip title="Fit" body="Frame every card on the board" />
          <Tip title="100%" body="Tap the zoom percent to reset" />
          <Tip title="Undo / Redo" body="Bottom bar history buttons" />
          <Tip title="Files panel" body="Jump the camera to a placed file" />
          <Tip title="Draw palette" body="Change ink color and stroke width" />
          <Tip title="Bring forward" body="Selection bar arrows change stack order" />
        </View>
      </View>
      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerText}>
          Tip: Pinch zooms under your fingers. Drag cards to move them. In Draw, one finger inks and
          two fingers pan.
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
