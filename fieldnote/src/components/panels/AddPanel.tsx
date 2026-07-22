import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ModalShell } from './ModalShell';
import { useBoard } from '../../store/BoardContext';
import { colors, radii } from '../../theme';
import { pickAndBuildFileItems, pickAndBuildPhotoItems } from '../../lib/files';
import { placeCentered } from '../../lib/placement';
import { createMindMapTree } from '../../lib/mindMap';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
  onPlaced?: (label: string) => void;
}

export function AddPanel({ visible, onClose, viewCenter, onPlaced }: Props) {
  const { addItem, addItems } = useBoard();

  const placeAtCenter = (w: number, h: number, index = 0) =>
    placeCentered(viewCenter, w, h, index);

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
      text: '# Note\n\nWrite **markdown** here.',
      fontSize: 22,
      role: 'body',
      markdown: true,
    });
    onPlaced?.('Text note added');
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
    });
    onPlaced?.('Task added');
    onClose();
  };

  const addMindMap = () => {
    const { x, y } = placeAtCenter(280, 180);
    const tree = createMindMapTree(
      { x, y },
      { root: 'Idea', branches: ['Branch', 'Branch'] },
    );
    addItems(
      tree.map((node) => ({
        type: 'mindmap' as const,
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        backgroundColor: colors.paper,
        text: node.text,
        children: node.children,
      })),
    );
    onPlaced?.('Mind map added');
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
    onPlaced?.('Region added');
    onClose();
  };

  const addShape = (shape: 'rect' | 'ellipse') => {
    const { x, y } = placeAtCenter(220, 160);
    addItem({
      type: 'shape',
      x,
      y,
      width: 220,
      height: 160,
      shape,
      color: colors.clayDeep,
      backgroundColor: 'rgba(233,178,127,0.25)',
    });
    onPlaced?.(shape === 'rect' ? 'Rectangle added' : 'Ellipse added');
    onClose();
  };

  const pickFiles = async () => {
    try {
      const items = await pickAndBuildFileItems(viewCenter);
      if (items.length === 0) return;
      addItems(items);
      onPlaced?.(items.length === 1 ? 'File placed' : `${items.length} files placed`);
      onClose();
    } catch (e) {
      onPlaced?.(`Could not open files: ${String(e)}`);
    }
  };

  const pickImages = async () => {
    try {
      const items = await pickAndBuildPhotoItems(viewCenter);
      if (items.length === 0) return;
      addItems(items);
      onPlaced?.(items.length === 1 ? 'Photo placed' : `${items.length} photos placed`);
      onClose();
    } catch (e) {
      onPlaced?.(`Could not open photos: ${String(e)}`);
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
    onPlaced?.('Folder card added');
    onClose();
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Add to Fieldnote"
      subtitle="Items place at the center of your current view."
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
          <Text style={styles.secondarySub}>Place a folder label on the board.</Text>
        </View>
      </Pressable>

      <View style={styles.createHead}>
        <Text style={styles.section}>Create</Text>
        <Text style={styles.hint}>Added at the live camera center.</Text>
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
          label="Rect"
          onPress={() => addShape('rect')}
          icon={<Ionicons name="square-outline" size={22} color={colors.ink} />}
        />
        <CreateBtn
          label="Ellipse"
          onPress={() => addShape('ellipse')}
          icon={<Ionicons name="ellipse-outline" size={22} color={colors.ink} />}
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
    <Pressable style={styles.createBtn} onPress={onPress}>
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
