import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { copyText, readClipboardText, shareText } from '../../lib/share';
import { hapticSuccess } from '../../lib/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function PasteAiPanel({ visible, onClose, onToast }: Props) {
  const { pasteAiBoard, importJsonCanvasText } = useBoard();
  const [text, setText] = useState('');

  const runPaste = async () => {
    const result = pasteAiBoard(text);
    if (!result.ok) {
      onToast(result.error ?? 'Paste failed');
      return;
    }
    await hapticSuccess();
    onToast(`Replaced board · ${result.count} items (snapshot saved)`);
    setText('');
    onClose();
  };

  const runImportMerge = () => {
    const result = importJsonCanvasText(text);
    if (!result.ok) {
      onToast(result.error ?? 'Import failed');
      return;
    }
    onToast(`Merged ${result.count} items (snapshot saved)`);
    setText('');
    onClose();
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Paste AI Board"
      subtitle="Paste JSON Canvas from any LLM. Replace or merge — a recovery snapshot is saved first."
      icon="sparkles-outline"
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder='{"nodes":[...],"edges":[...]}'
        placeholderTextColor={colors.mutedInk}
        multiline
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            const clip = await readClipboardText();
            if (clip) setText(clip);
            else onToast('Clipboard empty');
          }}
        >
          <Ionicons name="clipboard-outline" size={16} color={colors.ink} />
          <Text style={styles.secondaryText}>From clipboard</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setText('')}>
          <Ionicons name="close" size={16} color={colors.ink} />
          <Text style={styles.secondaryText}>Clear</Text>
        </Pressable>
      </View>
      <Pressable style={styles.primary} onPress={() => void runPaste()}>
        <Text style={styles.primaryText}>Replace board (Paste AI)</Text>
      </Pressable>
      <Pressable style={styles.merge} onPress={runImportMerge}>
        <Text style={styles.mergeText}>Merge onto current board</Text>
      </Pressable>
    </ModalShell>
  );
}

export function ExportCanvasPanel({ visible, onClose, onToast }: Props) {
  const { exportJsonCanvas } = useBoard();

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Export JSON Canvas"
      subtitle="Obsidian-compatible .canvas JSON"
      icon="share-outline"
    >
      <Pressable
        style={styles.primary}
        onPress={async () => {
          const json = exportJsonCanvas();
          const shared = await shareText(json);
          if (shared) onToast('Shared .canvas');
          else {
            const copied = await copyText(json);
            onToast(copied ? 'Copied JSON Canvas' : 'Could not share or copy');
          }
          onClose();
        }}
      >
        <Text style={styles.primaryText}>Share / copy .canvas</Text>
      </Pressable>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 160,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
    padding: 12,
    color: colors.ink,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    padding: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.cream, fontWeight: '700' },
  merge: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  mergeText: { color: colors.ink, fontWeight: '600' },
  secondary: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  secondaryText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
});
