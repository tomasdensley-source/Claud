import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../../store/BoardContext';
import { colors, radii, shadows } from '../../theme';
import { BoardItem, WorkingFileRecord } from '../../types';
import { fromPortableUri, humanFileSize, persistedAssetExists, persistPickedAsset } from '../../lib/localFiles';
import {
  boardFileName,
  boardFileSearchText,
  classifyFile,
  createWorkingFileRecords,
  isBoardFileItem,
  makeFileCardDrafts,
  PickedFileLike,
  workingFileSearchText,
} from '../../lib/fileTypes';

interface Props {
  visible: boolean;
  onClose: () => void;
  viewCenter: { x: number; y: number };
  onFocusItem: (x: number, y: number) => void;
}

type SheetStage = 'peek' | 'half' | 'full';
type BoardFileItem = Extract<BoardItem, { type: 'file' | 'folder' | 'image' | 'pdf' | 'audio' | 'markdown' }>;

function sheetHeight(stage: SheetStage) {
  const height = Dimensions.get('window').height || 640;
  if (stage === 'peek') return Math.max(210, height * 0.28);
  if (stage === 'half') return Math.max(360, height * 0.52);
  return Math.max(520, height * 0.86);
}

function nextStage(stage: SheetStage, dy: number): SheetStage {
  if (dy < -40) return stage === 'peek' ? 'half' : 'full';
  if (dy > 40) return stage === 'full' ? 'half' : 'peek';
  return stage;
}

function sortBoardFiles(items: BoardFileItem[]) {
  return [...items].sort((a, b) => boardFileName(a).localeCompare(boardFileName(b)));
}

function sortWorkingFiles(items: WorkingFileRecord[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function FilesPanel({ visible, onClose, viewCenter, onFocusItem }: Props) {
  const { currentBoard, addItem, addItems, select, setPanel, workingFiles, addWorkingFiles, removeWorkingFile, showToast } = useBoard();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<SheetStage>('half');
  const [missingUris, setMissingUris] = useState<Set<string>>(new Set());
  const dragStart = useRef<SheetStage>('half');
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderGrant: () => {
          dragStart.current = stage;
        },
        onPanResponderRelease: (_, gesture) => {
          setStage(nextStage(dragStart.current, gesture.dy));
        },
      }),
    [stage],
  );

  useEffect(() => {
    if (!visible) return;
    setStage('half');
  }, [visible]);

  const files = useMemo(
    () => currentBoard.items.filter(isBoardFileItem),
    [currentBoard.items],
  );

  useEffect(() => {
    if (!visible) return;
    const uris = [
      ...files.flatMap((item) => ('uri' in item && item.uri ? [item.uri] : [])),
      ...workingFiles.map((file) => file.uri),
    ];
    let cancelled = false;
    void Promise.all(uris.map(async (uri) => [uri, await persistedAssetExists(fromPortableUri(uri))] as const)).then((entries) => {
      if (cancelled) return;
      setMissingUris(new Set(entries.filter(([, exists]) => !exists).map(([uri]) => uri)));
    });
    return () => {
      cancelled = true;
    };
  }, [files, visible, workingFiles]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = sortBoardFiles(files).filter((it) => !normalizedQuery || boardFileSearchText(it).includes(normalizedQuery));
  const filteredLibrary = sortWorkingFiles(workingFiles).filter((file) => !normalizedQuery || workingFileSearchText(file).includes(normalizedQuery));
  const groupedBoard = useMemo(() => {
    return filtered.reduce<Record<string, typeof filtered>>((groups, item) => {
      const key = item.type === 'folder' ? 'folders' : classifyFile('mimeType' in item ? item.mimeType : undefined, boardFileName(item));
      groups[key] = groups[key] ?? [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [filtered]);
  const groupedLibrary = useMemo(() => {
    return filteredLibrary.reduce<Record<string, typeof filteredLibrary>>((groups, file) => {
      const key = classifyFile(file.mimeType, file.name);
      groups[key] = groups[key] ?? [];
      groups[key].push(file);
      return groups;
    }, {});
  }, [filteredLibrary]);

  const upload = async () => {
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
      showToast(`${assets.length} upload${assets.length === 1 ? '' : 's'} complete.`);
    } catch (e) {
      Alert.alert('Could not upload files', String(e));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close working files" />
        <View style={[styles.sheet, { height: sheetHeight(stage) }, shadows.control]}>
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={styles.handle} />
            <Text style={styles.handleText}>Working files · drag for peek, half, or full</Text>
          </View>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Working files</Text>
              <Text style={styles.subtitle}>Board files and device-local library, sorted by name.</Text>
            </View>
            {(['peek', 'half', 'full'] as const).map((option) => (
              <Pressable key={option} style={[styles.stageBtn, stage === option && styles.stageBtnActive]} onPress={() => setStage(option)} accessibilityLabel={`${option} height`}>
                <Text style={[styles.stageText, stage === option && styles.stageTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={upload} accessibilityRole="button">
              <Ionicons name="cloud-upload-outline" size={16} color={colors.cream} />
              <Text style={styles.primaryText}>Upload files</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                addItem({
                  type: 'folder',
                  x: viewCenter.x - 120,
                  y: viewCenter.y - 70,
                  width: 240,
                  height: 140,
                  name: 'New folder',
                  fileCount: 0,
                  backgroundColor: colors.paperStrong,
                });
                showToast('Folder card placed.');
              }}
              accessibilityRole="button"
            >
              <Ionicons name="folder-open-outline" size={16} color={colors.ink} />
              <Text style={styles.secondaryText}>New folder</Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search working files"
            placeholderTextColor={colors.mutedInk}
            style={styles.search}
          />
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.length === 0 && filteredLibrary.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{workingFiles.length} working files stored</Text>
                <Text style={styles.emptySub}>Upload files or choose photos from Add to keep them with this board.</Text>
              </View>
            ) : null}
            {Object.entries(groupedBoard).map(([group, items]) => (
              <View key={`board-${group}`} style={styles.group}>
                <Text style={styles.section}>On board · {group}</Text>
                {items.map((it) => {
                  const label = boardFileName(it);
                  const itemUri = 'uri' in it ? it.uri : undefined;
                  const missing = Boolean(itemUri && missingUris.has(itemUri));
                  return (
                    <Pressable
                      key={it.id}
                      style={[styles.row, missing && styles.missingRow]}
                      onPress={() => {
                        select([it.id]);
                        onFocusItem(it.x + it.width / 2, it.y + it.height / 2);
                        setPanel(null);
                        onClose();
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.glyph}>{it.type === 'folder' ? 'Folder' : it.type === 'image' ? 'Image' : it.type.toUpperCase()}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{label}</Text>
                        <Text style={styles.meta}>{[it.type, 'size' in it ? humanFileSize(it.size) : null, missing ? 'missing file' : null].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <Ionicons name={missing ? 'warning-outline' : 'locate-outline'} size={18} color={missing ? colors.blocked : colors.mutedInk} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
            {Object.entries(groupedLibrary).map(([group, items]) => (
              <View key={`library-${group}`} style={styles.group}>
                <Text style={styles.section}>Library · {group}</Text>
                {items.map((file) => {
                  const missing = missingUris.has(file.uri);
                  return (
                    <Pressable
                      key={file.id}
                      style={[styles.row, missing && styles.missingRow]}
                      onPress={() => {
                        if (missing) {
                          showToast(`${file.name} is missing from device storage.`);
                          return;
                        }
                        addItem(makeFileCardDrafts([file], viewCenter)[0]);
                        showToast(`${file.name} placed on board.`);
                        onClose();
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.glyph}>{classifyFile(file.mimeType, file.name).toUpperCase()}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{file.name}</Text>
                        <Text style={styles.meta}>{[file.mimeType ?? 'document', humanFileSize(file.size), missing ? 'missing file' : null].filter(Boolean).join(' · ')}</Text>
                      </View>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          removeWorkingFile(file.id);
                        }}
                        style={styles.iconBtn}
                        accessibilityLabel={`Remove ${file.name}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.mutedInk} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  handleWrap: { minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 6 },
  handle: { width: 58, height: 6, borderRadius: 999, backgroundColor: 'rgba(52,38,29,0.28)' },
  handleText: { color: colors.mutedInk, fontSize: 11, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
  stageBtn: {
    minHeight: 44,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: colors.paperStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBtnActive: { backgroundColor: colors.walnut },
  stageText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  stageTextActive: { color: colors.cream },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: {
    minHeight: 44,
    backgroundColor: colors.clayDeep,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  primaryText: { color: colors.cream, fontWeight: '700' },
  secondary: {
    minHeight: 44,
    backgroundColor: colors.paperStrong,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  search: {
    minHeight: 44,
    backgroundColor: colors.paperStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.08)',
  },
  list: { gap: 12, paddingBottom: 28 },
  group: { gap: 8 },
  empty: { padding: 18, borderRadius: radii.control, backgroundColor: colors.paperStrong },
  emptyTitle: { color: colors.ink, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: colors.mutedInk, lineHeight: 18 },
  section: { color: colors.ink, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.paperStrong,
  },
  missingRow: { borderWidth: 1, borderColor: 'rgba(200,101,69,0.45)' },
  glyph: { fontSize: 20 },
  name: { color: colors.ink, fontWeight: '700' },
  meta: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
