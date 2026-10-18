import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'export' | 'import';

export function ImportExportPanel({ visible, onClose }: Props) {
  const {
    currentBoard,
    exportBoardAsJSONCanvas,
    importJSONCanvas,
    repairCurrentBoard,
    showToast,
  } = useBoard();
  const [mode, setMode] = useState<Mode>('export');
  const [pasted, setPasted] = useState('');

  const exported = useMemo(
    () => (visible && mode === 'export' ? exportBoardAsJSONCanvas() : ''),
    [visible, mode, exportBoardAsJSONCanvas],
  );

  const runImport = (importMode: 'replace' | 'append') => {
    if (!pasted.trim()) return;
    const doIt = () => {
      const result = importJSONCanvas(pasted, importMode);
      if (!result.ok) {
        showToast(result.issues[0] ?? 'Could not import that board.');
        return;
      }
      showToast(`Added ${result.count} card(s)`, { undoable: true });
      setPasted('');
      onClose();
    };
    if (importMode === 'replace') {
      Alert.alert(
        'Replace current board?',
        'This swaps every card on this board for the pasted content. Undo will restore it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: doIt },
        ],
      );
    } else {
      doIt();
    }
  };

  const runRepair = () => {
    const result = repairCurrentBoard();
    if (!result.changed) {
      showToast('Nothing to repair — this board already looks tidy.');
      return;
    }
    showToast(result.issues[0] ?? 'Board repaired', { undoable: true });
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Import / export"
      subtitle="JSON Canvas — share boards or bring in an AI-generated one."
      icon="swap-horizontal-outline"
      wide
    >
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'export' && styles.tabActive]}
          onPress={() => setMode('export')}
        >
          <Text style={[styles.tabText, mode === 'export' && styles.tabTextActive]}>Export</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'import' && styles.tabActive]}
          onPress={() => setMode('import')}
        >
          <Text style={[styles.tabText, mode === 'import' && styles.tabTextActive]}>
            Paste / import
          </Text>
        </Pressable>
      </View>

      {mode === 'export' ? (
        <>
          <Text style={styles.hint}>
            “{currentBoard.name}” as JSON Canvas 1.0. Select all and copy to share it or open it
            in Obsidian.
          </Text>
          <TextInput
            value={exported}
            editable={false}
            multiline
            style={styles.jsonBox}
            selectTextOnFocus
          />
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Paste a JSON Canvas document — your own export, an Obsidian canvas, or a board pasted
            from an AI generator. Broken coordinates are repaired automatically.
          </Text>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            multiline
            placeholder="Paste JSON Canvas here..."
            placeholderTextColor={colors.mutedInk}
            style={styles.jsonBox}
          />
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={() => runImport('append')}>
              <Ionicons name="add-outline" size={16} color={colors.ink} />
              <Text style={styles.secondaryText}>Add to this board</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={() => runImport('replace')}>
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.cream} />
              <Text style={styles.primaryText}>Replace this board</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable style={styles.repair} onPress={runRepair}>
        <Ionicons name="construct-outline" size={16} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={styles.repairTitle}>Repair map</Text>
          <Text style={styles.repairSub}>
            Fix out-of-range or stacked cards on the current board.
          </Text>
        </View>
      </Pressable>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.control - 4,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.walnut,
  },
  tabText: { color: colors.mutedInk, fontWeight: '700' },
  tabTextActive: { color: colors.cream },
  hint: { color: colors.mutedInk, lineHeight: 18 },
  jsonBox: {
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    padding: 12,
    color: colors.ink,
    fontFamily: 'monospace',
    fontSize: 12,
    minHeight: 180,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  primaryText: { color: colors.cream, fontWeight: '700' },
  secondary: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  repair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
  },
  repairTitle: { color: colors.ink, fontWeight: '700' },
  repairSub: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
});
