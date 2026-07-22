import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

type Level = 'root' | 'device' | 'new';

interface Props {
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onInternal: () => void;
  onDeviceFiles: () => void;
  onDevicePhotos: () => void;
  onNewText: () => void;
  onNewTask: () => void;
  onNewMindMap: () => void;
  onNewRegion: () => void;
  onMore: () => void;
}

type MenuBtn = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

/** In-place contextual add menu with root / device / new levels. */
export function ContextualAddMenu({
  visible,
  x,
  y,
  onClose,
  onInternal,
  onDeviceFiles,
  onDevicePhotos,
  onNewText,
  onNewTask,
  onNewMindMap,
  onNewRegion,
  onMore,
}: Props) {
  const [level, setLevel] = useState<Level>('root');

  useEffect(() => {
    if (visible) setLevel('root');
  }, [visible]);

  if (!visible) return null;

  const run = async (fn: () => void) => {
    await hapticSelection();
    fn();
  };

  const rootBtns: MenuBtn[] = [
    { key: 'files', label: 'Files', icon: 'folder-outline', onPress: () => run(onInternal) },
    {
      key: 'device',
      label: 'Device',
      icon: 'phone-portrait-outline',
      onPress: () => run(() => setLevel('device')),
    },
    {
      key: 'new',
      label: 'New',
      icon: 'add-circle-outline',
      onPress: () => run(() => setLevel('new')),
    },
  ];

  const deviceBtns: MenuBtn[] = [
    {
      key: 'dev-files',
      label: 'Files',
      icon: 'document-outline',
      onPress: () => run(onDeviceFiles),
    },
    {
      key: 'dev-photos',
      label: 'Photos',
      icon: 'image-outline',
      onPress: () => run(onDevicePhotos),
    },
    {
      key: 'back',
      label: 'Back',
      icon: 'chevron-back',
      onPress: () => run(() => setLevel('root')),
    },
  ];

  const newBtns: MenuBtn[] = [
    { key: 'text', label: 'Text', icon: 'text-outline', onPress: () => run(onNewText) },
    {
      key: 'task',
      label: 'Task',
      icon: 'checkbox-outline',
      onPress: () => run(onNewTask),
    },
    {
      key: 'mind',
      label: 'Mind map',
      icon: 'git-network-outline',
      onPress: () => run(onNewMindMap),
    },
    {
      key: 'region',
      label: 'Region',
      icon: 'map-outline',
      onPress: () => run(onNewRegion),
    },
    {
      key: 'more',
      label: 'More',
      icon: 'ellipsis-horizontal',
      onPress: () => run(onMore),
    },
    {
      key: 'back',
      label: 'Back',
      icon: 'chevron-back',
      onPress: () => run(() => setLevel('root')),
    },
  ];

  const btns = level === 'root' ? rootBtns : level === 'device' ? deviceBtns : newBtns;
  const approxW = btns.length * 64 + 40;
  const approxH = 66;
  const { width: sw, height: sh } = Dimensions.get('window');
  const left = Math.min(Math.max(8, x - approxW / 2), Math.max(8, sw - approxW - 8));
  const top = Math.min(Math.max(8, y - approxH / 2), Math.max(8, sh - approxH - 8));

  return (
    <View style={[styles.wrap, shadows.control, { left, top }]} pointerEvents="box-none">
      <View style={styles.card}>
        {btns.map((btn) => (
          <Pressable
            key={btn.key}
            style={styles.btn}
            onPress={btn.onPress}
            accessibilityLabel={btn.label}
          >
            <Ionicons name={btn.icon} size={18} color={colors.cream} />
            <Text style={styles.label} numberOfLines={1}>
              {btn.label}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close">
          <Ionicons name="close" size={16} color={colors.cream} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btn: {
    width: 64,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    color: 'rgba(255,250,240,0.88)',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 60,
    textAlign: 'center',
  },
  close: {
    width: 28,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
