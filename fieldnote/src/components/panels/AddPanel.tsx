import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { persistPickedAsset } from '../../lib/localFiles';
import { createWorkingFileRecords, makeFileCardDrafts, PickedFileLike } from '../../lib/fileTypes';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
}

export function AddPanel({ visible, onClose, viewCenter }: Props) {
  const { addItem, addItems, addScientificTemplate, addWorkingFiles, showToast } = useBoard();

  const placeAtCenter = (w: number, h: number) => ({
    x: viewCenter.x - w / 2,
    y: viewCenter.y - h / 2,
  });

  const addText = () => {
    const { x, y } = placeAtCenter(320, 140);
    addItem({
      type: 'text',
      x,
      y,
      width: 320,
      height: 140,
      backgroundColor: colors.paper,
      color: colors.ink,
      text: '',
      fontSize: 22,
      role: 'body',
    });
    onClose();
  };

  const addTask = () => {
    const { x, y } = placeAtCenter(300, 100);
    addItem({
      type: 'task',
      x,
      y,
      width: 300,
      height: 100,
      backgroundColor: colors.paperStrong,
      text: 'New task',
      done: false,
      dependsOn: [],
      state: 'ready',
    });
    onClose();
  };

  const addMindMap = () => {
    const { x, y } = placeAtCenter(280, 180);
    addItem({
      type: 'mindmap',
      x,
      y,
      width: 280,
      height: 180,
      backgroundColor: colors.paper,
      text: 'Idea',
      parentId: null,
      collapsed: false,
      branchColor: colors.clayDeep,
    });
    onClose();
  };

  const addShape = () => {
    const { x, y } = placeAtCenter(220, 140);
    addItem({
      type: 'shape',
      x,
      y,
      width: 220,
      height: 140,
      shape: 'rect',
      backgroundColor: 'rgba(216,230,232,0.42)',
    });
    onClose();
  };

  const addRegion = () => {
    const { x, y } = placeAtCenter(360, 240);
    addItem({
      type: 'region',
      x,
      y,
      width: 360,
      height: 240,
      label: 'Region',
    });
    onClose();
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['image/*', 'application/pdf', 'text/*', 'audio/*', 'application/json'],
      });
      if (result.canceled) return;
      const assets: PickedFileLike[] = await Promise.all(result.assets.map(async (asset) => {
        const uri = await persistPickedAsset(asset);
        const isMarkdown = /\.(md|markdown)$/i.test(asset.name ?? '') || (asset.mimeType ?? '').toLowerCase().includes('markdown');
        const text = isMarkdown ? await FileSystem.readAsStringAsync(asset.uri).catch(() => undefined) : undefined;
        return { ...asset, uri, text };
      }));
      addItems(makeFileCardDrafts(assets, viewCenter));
      addWorkingFiles(createWorkingFileRecords(assets), false);
      showToast(`${assets.length} file${assets.length === 1 ? '' : 's'} placed on board.`);
      onClose();
    } catch (e) {
      Alert.alert('Could not open files', String(e));
    }
  };

  const pickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to place images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.9,
        mediaTypes: ['images'],
      });
      if (result.canceled) return;
      const assets = await Promise.all(result.assets.map(async (asset) => ({
        ...asset,
        uri: await persistPickedAsset({ uri: asset.uri, name: asset.fileName }),
      })));
      const picked = assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName ?? 'Photo',
        mimeType: asset.mimeType,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
      }));
      addItems(makeFileCardDrafts(picked, viewCenter));
      addWorkingFiles(createWorkingFileRecords(picked), false);
      showToast(`${assets.length} photo${assets.length === 1 ? '' : 's'} imported.`);
      onClose();
    } catch (e) {
      Alert.alert('Could not open photos', String(e));
    }
  };

  const chooseFolder = () => {
    const { x, y } = placeAtCenter(240, 140);
    addItem({
      type: 'folder',
      x,
      y,
      width: 240,
      height: 140,
      name: 'Folder',
      fileCount: 0,
      backgroundColor: colors.paperStrong,
    });
    onClose();
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Add to Fieldnote"
      subtitle="Choose one thing, then return to your board."
      icon="sparkles-outline"
    >
      <Text style={styles.section}>From your device</Text>
      <Pressable style={[styles.primaryBtn]} onPress={pickFiles}>
        <Ionicons name="cloud-upload-outline" size={20} color={colors.cream} />
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryTitle}>Choose files</Text>
          <Text style={styles.primarySub}>Pick several and place them now.</Text>
        </View>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={pickImages}>
        <Ionicons name="images-outline" size={20} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={styles.secondaryTitle}>Choose photos</Text>
          <Text style={styles.secondarySub}>Place images from your library.</Text>
        </View>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={chooseFolder}>
        <Ionicons name="folder-open-outline" size={20} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text style={styles.secondaryTitle}>Folder card</Text>
          <Text style={styles.secondarySub}>Create an organizer card; folder import is not supported.</Text>
        </View>
      </Pressable>

      <View style={styles.createHead}>
        <Text style={styles.section}>Create</Text>
        <Text style={styles.hint}>Add at the center of the current view.</Text>
      </View>
      <View style={styles.createRow}>
        <CreateBtn label="Text" onPress={addText} icon={<Text style={styles.tIcon}>T</Text>} />
        <CreateBtn
          label="Task"
          onPress={addTask}
          icon={<Ionicons name="checkbox-outline" size={22} color={colors.ink} />}
        />
        <CreateBtn
          label="Mind map"
          onPress={addMindMap}
          icon={<MaterialCommunityIcons name="graphql" size={22} color={colors.ink} />}
        />
        <CreateBtn
          label="Region"
          onPress={addRegion}
          icon={<Ionicons name="grid-outline" size={22} color={colors.ink} />}
        />
        <CreateBtn
          label="Shape"
          onPress={addShape}
          icon={<Ionicons name="shapes-outline" size={22} color={colors.ink} />}
        />
        <CreateBtn
          label="Science"
          onPress={() => {
            addScientificTemplate(viewCenter);
            onClose();
          }}
          icon={<MaterialCommunityIcons name="flask-outline" size={22} color={colors.ink} />}
        />
      </View>
    </ModalShell>
  );
}

function CreateBtn({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.createBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Create ${label}`}>
      {icon}
      <Text style={styles.createLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryTitle: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 16,
  },
  primarySub: {
    color: 'rgba(255,250,240,0.82)',
    fontSize: 12,
    marginTop: 2,
  },
  secondaryBtn: {
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  secondaryTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  secondarySub: {
    color: colors.mutedInk,
    fontSize: 12,
    marginTop: 2,
  },
  createHead: {
    marginTop: 4,
    gap: 4,
  },
  hint: {
    color: colors.mutedInk,
    fontSize: 12,
  },
  createRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  createBtn: {
    width: '47%',
    minHeight: 88,
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  createLabel: {
    color: colors.ink,
    fontWeight: '600',
    fontSize: 13,
  },
  tIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
  },
});
