import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { directoryUsage } from '../../lib/localFiles';
import { estimateStorageUsage } from '../../lib/storageCore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function MorePanel({ visible, onClose }: Props) {
  const { currentBoard, visibleItems, selectedIds, undo, redo, canUndo, canRedo, select, setPanel, resetToSeed, exportCurrentBoard, importBoardJson, removeSelectedDependency, updateItems } = useBoard();
  const tasks = currentBoard.items.filter((item) => item.type === 'task');
  const selectedTask = currentBoard.items.find((item) => selectedIds.length === 1 && item.id === selectedIds[0] && item.type === 'task');

  const importJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      importBoardJson(text);
      onClose();
    } catch {
      Alert.alert('Could not import JSON', 'Choose a readable Fieldnote export and try again.');
    }
  };

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
        icon="share-outline"
        title="Export board JSON"
        subtitle="Share or copy a portable board backup"
        onPress={() => {
          void exportCurrentBoard();
          onClose();
        }}
      />
      <Row
        icon="download-outline"
        title="Import JSON"
        subtitle="Choose a Fieldnote JSON export"
        onPress={() => {
          void importJson();
        }}
      />
      <Row
        icon="checkbox-outline"
        title="Select all"
        subtitle="Select every visible card on this board"
        onPress={() => {
          select(visibleItems.map((item) => item.id));
          onClose();
        }}
      />
      <Row
        icon="text-outline"
        title="Select text cards"
        subtitle="Select every visible text note"
        onPress={() => {
          select(visibleItems.filter((item) => item.type === 'text').map((item) => item.id));
          onClose();
        }}
      />
      <Row
        icon="document-outline"
        title="Select file cards"
        subtitle="Select visible files, PDFs, audio, Markdown, folders, and images"
        onPress={() => {
          select(visibleItems.filter((item) => ['file', 'pdf', 'audio', 'markdown', 'folder', 'image'].includes(item.type)).map((item) => item.id));
          onClose();
        }}
      />
      <Row
        icon="git-branch-outline"
        title="Remove selected task dependency"
        subtitle={selectedTask?.type === 'task' && selectedTask.dependsOn.length ? `Removes one of ${selectedTask.dependsOn.length} dependencies` : 'Select one task with dependencies first'}
        disabled={!(selectedTask?.type === 'task' && selectedTask.dependsOn.length > 0)}
        onPress={() => {
          removeSelectedDependency();
          onClose();
        }}
      />
      <Row
        icon="flag-outline"
        title="Cycle selected task priority"
        subtitle="Low -> normal -> high"
        disabled={selectedTask?.type !== 'task'}
        onPress={() => {
          updateItems((items) => items.map((item) => {
            if (item.id !== selectedTask?.id || item.type !== 'task') return item;
            const next = item.priority === 'low' ? 'normal' : item.priority === 'high' ? 'low' : 'high';
            return { ...item, priority: next };
          }));
          onClose();
        }}
      />
      <Row
        icon="calendar-outline"
        title="Set selected task due today"
        subtitle="Uses YYYY-MM-DD format"
        disabled={selectedTask?.type !== 'task'}
        onPress={() => {
          const today = new Date().toISOString().slice(0, 10);
          updateItems((items) => items.map((item) => item.id === selectedTask?.id && item.type === 'task' ? { ...item, dueDate: today } : item));
          onClose();
        }}
      />
      <Row
        icon="grid-outline"
        title="Add region card"
        subtitle="Create a draggable region from Add"
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
        subtitle="Export first if needed; clears boards and copied files"
        onPress={() => {
          Alert.alert('Reset Fieldnote?', 'This replaces saved boards with the demo board and deletes copied Fieldnote files. Export a backup first if needed.', [
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
      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerText}>Fieldnote 1.0.7 · Haptics are enabled after accepted edits, drops, connects, and confirmations.</Text>
      </View>
      {tasks.length ? (
        <View style={styles.statCard}>
          <Text style={styles.stat}>Tasks</Text>
          {tasks.slice(0, 8).map((task) => task.type === 'task' ? (
            <Text key={task.id} style={styles.rowSub}>
              {task.done ? 'Done' : task.state === 'blocked' ? 'Blocked' : 'Ready'} · {task.text || 'Untitled task'}
            </Text>
          ) : null)}
        </View>
      ) : null}
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
          <Tip title="Double tap empty space" body="Open Add without accidental long-presses" />
          <Tip title="Multi button" body="Select several cards" />
          <Tip title="Drag empty space in Multi" body="Marquee select visible cards" />
        </View>
        <View style={styles.col}>
          <Text style={styles.colTitle}>Panels</Text>
          <Tip title="Back button" body="Closes the open panel first on Android" />
          <Tip title="Copy, paste, lock" body="Use the selection bar; paste also appears beside zoom when the clipboard has content" />
          <Tip title="Files" body="Picked files are copied into Fieldnote storage before being placed" />
          <Tip title="Audio" body="In-app playback is foreground-only; lock-screen audio is intentionally out of scope." />
          <Tip title="Web keyboard" body="Web wheel zoom and shortcuts are best-effort only; the mobile app is the primary surface." />
          <Tip title="Multiple tabs" body="Fieldnote is local-first and does not coordinate concurrent edits across tabs." />
        </View>
      </View>
      <View style={styles.tipBanner}>
        <Text style={styles.tipBannerText}>Tip: Two fingers always pan and zoom while drawing.</Text>
      </View>
    </ModalShell>
  );
}

export function StoragePanel({ visible, onClose }: Props) {
  const { boards, workingFiles, resetToSeed, restoreFromBackup } = useBoard();
  const [filesBytes, setFilesBytes] = React.useState(0);
  React.useEffect(() => {
    if (!visible) return;
    void directoryUsage().then(setFilesBytes);
  }, [visible]);
  const itemCount = boards.reduce((n, b) => n + b.items.length, 0);
  const usage = estimateStorageUsage(boards, workingFiles);
  const approxBytes = usage.jsonBytes + Math.max(usage.fileBytes, filesBytes);
  const approxSize = approxBytes < 1024 * 1024 ? `${Math.round(approxBytes / 1024)} KB` : `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`;

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
        <Text style={styles.statSub}>{itemCount} cards · {workingFiles.length} working files · approx {approxSize}</Text>
        <Text style={styles.rowSub}>JSON {Math.round(usage.jsonBytes / 1024)} KB · fieldnote-files {Math.round(filesBytes / 1024)} KB</Text>
      </View>
      <Text style={styles.body}>
        Waiting before editing protects your saved work. Boards autosave as you move and write.
        Clearing app data or uninstalling removes local boards. Reset also deletes files copied into Fieldnote storage.
      </Text>
      <Pressable
        style={styles.restore}
        onPress={() => {
          Alert.alert('Restore latest backup?', 'This replaces the visible boards with the latest saved backup snapshot.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Restore', onPress: async () => restoreFromBackup() },
          ]);
        }}
      >
        <Text style={styles.restoreText}>Restore latest backup snapshot</Text>
      </Pressable>
      <Pressable
        style={styles.danger}
        onPress={() => {
          Alert.alert('Clear all local boards?', 'Export a backup first if needed. This also deletes copied Fieldnote files.', [
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
      accessibilityRole="button"
      accessibilityLabel={title}
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
  restore: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  restoreText: { color: colors.ink, fontWeight: '800' },
});
