import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
  scale: number;
  onFocusPlace: (x: number, y: number, zoom?: number) => void;
}

export function PlacesPanel({ visible, onClose, viewCenter, scale, onFocusPlace }: Props) {
  const { landmarks, addLandmarkAt, deleteLandmark } = useBoard();
  const [name, setName] = useState('');

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Places"
      subtitle="Landmarks on this board — jump back anytime."
      icon="locate-outline"
    >
      <View style={styles.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name this view"
          placeholderTextColor={colors.mutedInk}
          style={styles.input}
        />
        <Pressable
          style={styles.addBtn}
          accessibilityLabel="Save current view as place"
          onPress={async () => {
            const lm = await addLandmarkAt(
              name.trim() || `Place ${landmarks.length + 1}`,
              viewCenter.x,
              viewCenter.y,
              scale,
            );
            setName('');
            Alert.alert('Saved', lm.name);
          }}
        >
          <Ionicons name="add" size={18} color={colors.cream} />
        </Pressable>
      </View>

      {landmarks.length === 0 ? (
        <Text style={styles.empty}>No places yet. Save the current camera view.</Text>
      ) : (
        landmarks.map((lm) => (
          <Pressable
            key={lm.id}
            style={styles.row}
            onPress={() => {
              onFocusPlace(lm.x, lm.y, lm.zoom);
              onClose();
            }}
            accessibilityLabel={`Go to ${lm.name}`}
          >
            <Ionicons name="pin-outline" size={18} color={colors.clayDeep} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{lm.name}</Text>
              <Text style={styles.meta}>
                {Math.round(lm.x)}, {Math.round(lm.y)}
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              accessibilityLabel={`Delete ${lm.name}`}
              onPress={() => {
                Alert.alert('Remove place?', lm.name, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => void deleteLandmark(lm.id),
                  },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
            </Pressable>
          </Pressable>
        ))
      )}
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  addBtn: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { color: colors.mutedInk, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.paperStrong,
  },
  name: { color: colors.ink, fontWeight: '700' },
  meta: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
});
