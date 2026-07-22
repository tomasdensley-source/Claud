import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { BoardSnapshot, deleteSnapshot, listSnapshots } from '../../lib/snapshots';

interface Props {
  visible: boolean;
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export function SnapshotsPanel({ visible, onClose, onToast }: Props) {
  const { restoreSnapshot } = useBoard();
  const [snaps, setSnaps] = useState<BoardSnapshot[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const list = await listSnapshots();
    setSnaps(list);
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  const onRestore = async (id: string) => {
    setBusyId(id);
    try {
      const result = await restoreSnapshot(id);
      if (!result.ok) {
        onToast?.(result.error ?? 'Could not restore snapshot');
        return;
      }
      onToast?.('Snapshot restored');
      onClose();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    await deleteSnapshot(id);
    onToast?.('Snapshot deleted');
    await refresh();
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Recovery snapshots"
      subtitle="Restore a recent board backup from this device."
      icon="time-outline"
      variant="edge"
    >
      {snaps.length === 0 ? (
        <Text style={styles.empty}>
          No snapshots yet. They appear after Paste AI replace or merge.
        </Text>
      ) : (
        snaps.map((snap) => (
          <View key={snap.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{snap.label}</Text>
              <Text style={styles.meta}>{new Date(snap.createdAt).toLocaleString()}</Text>
            </View>
            <Pressable
              style={[styles.restoreBtn, busyId === snap.id && { opacity: 0.5 }]}
              disabled={busyId === snap.id}
              onPress={() => void onRestore(snap.id)}
              accessibilityLabel={`Restore ${snap.label}`}
            >
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={() => void onDelete(snap.id)}
              accessibilityLabel={`Delete ${snap.label}`}
            >
              <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
            </Pressable>
          </View>
        ))
      )}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.mutedInk, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.control,
    backgroundColor: colors.paperStrong,
  },
  label: { color: colors.ink, fontWeight: '700' },
  meta: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
  restoreBtn: {
    backgroundColor: colors.clayDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restoreText: { color: colors.cream, fontWeight: '700', fontSize: 13 },
});
