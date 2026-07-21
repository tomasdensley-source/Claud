import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, Line, Path, Rect as SvgRect } from 'react-native-svg';
import { BoardItem } from '../types';
import { colors, radii, shadows } from '../theme';
import { SEED_IMAGES } from '../lib/seedImages';
import { fromPortableUri, humanFileSize } from '../lib/localFiles';

type ConnectorSide = 'left' | 'right' | 'top' | 'bottom';
type AudioSound = {
  pauseAsync: () => Promise<unknown>;
  playAsync: () => Promise<unknown>;
  setPositionAsync: (positionMillis: number) => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
};
type PlaybackStatus = {
  isLoaded: boolean;
  error?: string;
  isPlaying?: boolean;
  positionMillis?: number;
  durationMillis?: number;
};
type AudioModule = {
  Audio?: {
    Sound?: {
      createAsync?: (
        source: { uri: string },
        initialStatus: { shouldPlay: boolean },
        onPlaybackStatusUpdate: (status: PlaybackStatus) => void,
      ) => Promise<{ sound: AudioSound }>;
    };
  };
};
let activeAudio: AudioSound | null = null;

async function loadAudioModule(): Promise<AudioModule | null> {
  try {
    return await import('expo-av');
  } catch {
    return null;
  }
}

async function openAudioExternally(uri: string, setAudioError: (message: string | null) => void) {
  try {
    await Linking.openURL(uri);
    setAudioError('Opened audio with another app.');
  } catch {
    setAudioError('Could not play this audio file.');
  }
}

interface Props {
  item: BoardItem;
  selected: boolean;
  editing: boolean;
  scale: number;
  lowDetail: boolean;
  dense: boolean;
  onSelect: () => void;
  onLongPress: () => void;
  onChangeText: (text: string) => void;
  onToggleTask: () => void;
  onEndEdit: () => void;
  onConnectorPress: (side: ConnectorSide) => void;
  onOpenUri: (uri?: string) => void;
  onResizeStart: (pageX: number, pageY: number) => void;
  onResizeMove: (pageX: number, pageY: number) => void;
  onResizeEnd: (pageX: number, pageY: number) => void;
  onMindChild: () => void;
  onMindSibling: () => void;
  onMindCollapse: () => void;
  onMindTidy: () => void;
  canConnect: boolean;
  connectingActive: boolean;
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function formatTime(ms?: number) {
  if (!ms || ms < 0) return '0:00';
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function estimatedPdfPageCount(item: BoardItem) {
  if (item.type !== 'pdf') return 1;
  const explicit = item.text?.match(/(?:pages?|pageCount)\D+(\d{1,4})/i)?.[1];
  if (explicit) return Math.max(1, Number(explicit));
  if (item.size) return Math.max(1, Math.min(500, Math.ceil(item.size / 90000)));
  return 1;
}

function markdownSections(text: string) {
  const limited = text.length > 120000 ? `${text.slice(0, 120000)}\n\n[Preview truncated at 120 KB]` : text;
  const sections: { title: string; body: string }[] = [];
  let current = { title: 'Preview', body: '' };
  limited.split(/\r?\n/).forEach((line) => {
    if (/^#{1,3}\s+/.test(line)) {
      if (current.body.trim() || current.title !== 'Preview') sections.push(current);
      current = { title: line.replace(/^#{1,3}\s+/, '').trim() || 'Section', body: '' };
    } else {
      current.body += `${line}\n`;
    }
  });
  if (current.body.trim() || current.title !== 'Preview') sections.push(current);
  return sections.length ? sections : [{ title: 'Preview', body: limited }];
}

function renderMarkdownLine(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return <Text key={index} style={styles.mdSpacer}> </Text>;
  if (/^[-*]\s+/.test(trimmed)) return <Text key={index} style={styles.mdBody}>• {trimmed.replace(/^[-*]\s+/, '')}</Text>;
  if (/^\d+\.\s+/.test(trimmed)) return <Text key={index} style={styles.mdBody}>{trimmed}</Text>;
  if (/^>\s+/.test(trimmed)) return <Text key={index} style={styles.mdQuote}>{trimmed.replace(/^>\s+/, '')}</Text>;
  return <Text key={index} style={styles.mdBody}>{trimmed.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')}</Text>;
}

export const CanvasItemView = memo(function CanvasItemView({
  item,
  selected,
  editing,
  scale,
  lowDetail,
  dense,
  onSelect,
  onLongPress,
  onChangeText,
  onToggleTask,
  onEndEdit,
  onConnectorPress,
  onOpenUri,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onMindChild,
  onMindSibling,
  onMindCollapse,
  onMindTidy,
  canConnect,
  connectingActive,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [collapsedMarkdown, setCollapsedMarkdown] = useState<Record<string, boolean>>({});
  const soundRef = useRef<AudioSound | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [scrubberWidth, setScrubberWidth] = useState(1);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [markdownQuery, setMarkdownQuery] = useState('');
  const [markdownEditing, setMarkdownEditing] = useState(false);
  const handleSize = Math.max(12, 14 / Math.max(scale, 0.2));
  const connectorSize = Math.max(20, 44 / Math.max(scale, 0.2));
  const showText = !lowDetail || editing;

  useEffect(() => () => {
    if (activeAudio === soundRef.current) activeAudio = null;
    void soundRef.current?.unloadAsync().catch(() => undefined);
    soundRef.current = null;
  }, []);

  const toggleAudio = async () => {
    if (item.type !== 'audio' || !item.uri) return;
    const resolvedUri = fromPortableUri(item.uri);
    if (!resolvedUri) return;
    setAudioError(null);
    try {
      if (!soundRef.current) {
        if (activeAudio && activeAudio !== soundRef.current) await activeAudio.pauseAsync().catch(() => undefined);
        const audioModule = await loadAudioModule();
        const createAsync = audioModule?.Audio?.Sound?.createAsync;
        if (!createAsync) {
          await openAudioExternally(resolvedUri, setAudioError);
          return;
        }
        const created = await createAsync({ uri: resolvedUri }, { shouldPlay: true }, (status: PlaybackStatus) => {
          if (!status.isLoaded) {
            if ('error' in status) setAudioError(status.error ?? 'Playback failed.');
            return;
          }
          setAudioPlaying(Boolean(status.isPlaying));
          setAudioPosition(status.positionMillis ?? 0);
          setAudioDuration(status.durationMillis ?? 0);
        });
        soundRef.current = created.sound;
        activeAudio = created.sound;
        setAudioPlaying(true);
        return;
      }
      if (audioPlaying) await soundRef.current.pauseAsync();
      else {
        if (activeAudio && activeAudio !== soundRef.current) await activeAudio.pauseAsync().catch(() => undefined);
        activeAudio = soundRef.current;
        await soundRef.current.playAsync();
      }
    } catch {
      await openAudioExternally(resolvedUri, setAudioError);
    }
  };

  const seekAudio = async (nextPosition: number) => {
    if (!soundRef.current || !audioDuration) return;
    try {
      await soundRef.current.setPositionAsync(Math.max(0, Math.min(audioDuration, nextPosition)));
    } catch {
      setAudioError('Could not seek in this audio file.');
    }
  };

  const scrubAudio = (event: GestureResponderEvent) => {
    if (!audioDuration) return;
    const x = Math.max(0, Math.min(scrubberWidth, event.nativeEvent.locationX));
    void seekAudio((x / Math.max(1, scrubberWidth)) * audioDuration);
  };

  const content = useMemo(() => {
    switch (item.type) {
      case 'text':
        if (editing) {
          return (
            <TextInput
              autoFocus
              multiline
              value={item.text}
              onChangeText={onChangeText}
              onBlur={onEndEdit}
              returnKeyType="done"
              style={[
                styles.text,
                {
                  color: item.color ?? colors.ink,
                  fontSize: item.fontSize,
                  fontWeight: item.fontWeight ?? '400',
                  textAlign: item.textAlign ?? 'left',
                  fontStyle: item.italic ? 'italic' : 'normal',
                },
              ]}
              placeholder="Write something..."
              placeholderTextColor={colors.mutedInk}
              maxFontSizeMultiplier={1.25}
            />
          );
        }
        return showText ? (
          <Text
            style={[
              styles.text,
              {
                color: item.color ?? colors.ink,
                fontSize: item.fontSize,
                fontWeight: item.fontWeight ?? '400',
                textAlign: item.textAlign ?? 'left',
                fontStyle: item.italic ? 'italic' : 'normal',
              },
            ]}
            numberOfLines={lowDetail ? 2 : undefined}
            maxFontSizeMultiplier={1.25}
          >
            {item.text || 'Write something...'}
          </Text>
        ) : <View style={styles.detailHidden} />;
      case 'image': {
        const source = item.assetKey
          ? SEED_IMAGES[item.assetKey]
          : item.uri
            ? { uri: fromPortableUri(item.uri) ?? item.uri }
            : null;
        if (!source || imageFailed) {
          return (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackGlyph}>Image unavailable</Text>
              <Text style={styles.fallbackSub}>{item.alt ?? 'Tap Add to choose another image.'}</Text>
            </View>
          );
        }
        return <Image source={source} style={styles.image} resizeMode="cover" onError={() => setImageFailed(true)} accessibilityLabel={item.alt ?? 'Image'} />;
      }
      case 'task': {
        const blocked = item.state === 'blocked';
        const ready = item.state === 'ready';
        return (
          <Pressable
            style={styles.taskRow}
            onPress={onToggleTask}
            onStartShouldSetResponder={() => true}
            disabled={item.locked}
            accessibilityLabel={`Task ${item.text}`}
          >
            <View style={[styles.checkbox, item.done && styles.checkboxDone, blocked && styles.checkboxBlocked]}>
              {item.done ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  returnKeyType="done"
                  style={[styles.taskText, item.done && styles.taskDone]}
                  maxFontSizeMultiplier={1.25}
                />
              ) : showText ? (
                <Text style={[styles.taskText, item.done && styles.taskDone, blocked && styles.taskBlocked]} numberOfLines={lowDetail ? 1 : 3}>
                  {item.text || 'New task'}
                </Text>
              ) : null}
              <Text style={[styles.taskMeta, ready && styles.readyText, item.done && styles.doneText]}>
                {item.done ? 'done' : blocked ? 'blocked' : 'ready'}
                {item.dependsOn.length ? ` · ${item.dependsOn.length} deps` : ''}
                {item.priority && item.priority !== 'normal' ? ` · ${item.priority}` : ''}
                {item.dueDate ? ` · due ${item.dueDate}` : ''}
              </Text>
            </View>
          </Pressable>
        );
      }
      case 'mindmap':
        return (
          <View style={styles.mindmap}>
            <View style={[styles.mindmapHub, { borderColor: item.branchColor }]}>
              {editing ? (
                <TextInput
                  autoFocus
                  value={item.text}
                  onChangeText={onChangeText}
                  onBlur={onEndEdit}
                  returnKeyType="done"
                  style={styles.mindmapHubText}
                  maxFontSizeMultiplier={1.2}
                />
              ) : (
                <Text style={styles.mindmapHubText} numberOfLines={lowDetail ? 1 : 2}>
                  {showText ? item.text || 'Idea' : 'Idea'}
                </Text>
              )}
            </View>
            {selected ? (
              <View style={styles.mindmapActions}>
                <ActionChip label="+ child" onPress={onMindChild} />
                <ActionChip label="+ sibling" onPress={onMindSibling} />
                <ActionChip label={item.collapsed ? 'expand' : 'collapse'} onPress={onMindCollapse} />
                <ActionChip label="tidy" onPress={onMindTidy} />
              </View>
            ) : null}
          </View>
        );
      case 'region':
        return (
          <View style={[styles.region, { opacity: item.opacity ?? 0.2, backgroundColor: item.backgroundColor ?? 'transparent' }]}>
            <Svg style={StyleSheet.absoluteFill}>
              {item.pattern !== 'solid' && Array.from({ length: 18 }).map((_, i) => (
                <Circle
                  key={i}
                  cx={18 + (i % 6) * 54}
                  cy={18 + Math.floor(i / 6) * 54}
                  r={2}
                  fill="rgba(52,38,29,0.18)"
                />
              ))}
              {item.pattern === 'stripes' && Array.from({ length: 9 }).map((_, i) => (
                <Line key={`stripe-${i}`} x1={i * 48} y1="100%" x2={i * 48 + 80} y2="0" stroke="rgba(52,38,29,0.14)" strokeWidth={2} />
              ))}
            </Svg>
            <Text style={styles.regionLabel}>{item.label || 'Region'}</Text>
          </View>
        );
      case 'shape':
        return (
          <Svg width="100%" height="100%">
            {item.shape === 'ellipse' ? (
              <Ellipse cx="50%" cy="50%" rx="45%" ry="40%" stroke={item.borderColor ?? colors.ink} strokeWidth={3} fill={item.backgroundColor ?? 'transparent'} />
            ) : item.shape === 'line' ? (
              <Line x1="8%" y1="50%" x2="92%" y2="50%" stroke={item.borderColor ?? colors.ink} strokeWidth={4} strokeLinecap="round" />
            ) : (
              <SvgRect x="8%" y="12%" width="84%" height="76%" rx={12} stroke={item.borderColor ?? colors.ink} strokeWidth={3} fill={item.backgroundColor ?? 'transparent'} />
            )}
          </Svg>
        );
      case 'drawing':
        return (
          <Svg width="100%" height="100%">
            {item.paths.map((path, i) => (
              <Path
                key={i}
                d={pointsToPath(path.points)}
                stroke={path.color}
                strokeWidth={path.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        );
      case 'file': {
        const size = humanFileSize(item.size);
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>File</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{[item.mimeType, size].filter(Boolean).join(' · ') || 'document'}</Text>
            <Pressable
              style={styles.openChip}
              onStartShouldSetResponder={() => true}
              onPress={() => {
                onOpenUri(item.uri);
              }}
            >
              <Text style={styles.openChipText}>Open</Text>
            </Pressable>
          </View>
        );
      }
      case 'folder':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>Folder</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{item.fileCount} files</Text>
          </View>
        );
      case 'audio':
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>AUDIO</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{formatTime(audioPosition)} / {formatTime(audioDuration)}</Text>
            <Pressable
              style={styles.scrubber}
              onLayout={(event) => setScrubberWidth(Math.max(1, event.nativeEvent.layout.width))}
              onPress={scrubAudio}
              onStartShouldSetResponder={() => true}
              accessibilityRole="adjustable"
              accessibilityLabel="Audio scrubber"
            >
              <View style={[styles.scrubberFill, { width: `${audioDuration ? Math.min(100, (audioPosition / audioDuration) * 100) : 0}%` }]} />
            </Pressable>
            {audioError ? <Text style={styles.errorText}>{audioError}</Text> : null}
            {item.uri ? (
              <View style={styles.inlineControls}>
                <Pressable style={styles.openChip} onStartShouldSetResponder={() => true} onPress={() => seekAudio(audioPosition - 15000)}>
                  <Text style={styles.openChipText}>-15s</Text>
                </Pressable>
                <Pressable style={styles.openChip} onStartShouldSetResponder={() => true} onPress={toggleAudio}>
                  <Text style={styles.openChipText}>{audioPlaying ? 'Pause' : 'Play'}</Text>
                </Pressable>
                <Pressable style={styles.openChip} onStartShouldSetResponder={() => true} onPress={() => seekAudio(audioPosition + 15000)}>
                  <Text style={styles.openChipText}>+15s</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      case 'pdf': {
        const pageCount = estimatedPdfPageCount(item);
        return (
          <View style={[styles.fileCard, styles.pdfCover]}>
            <Text style={styles.fileGlyph}>PDF</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta}>{pageCount} page{pageCount === 1 ? '' : 's'} · {humanFileSize(item.size) ?? 'portable document'}</Text>
            <Text style={styles.pdfPreview} numberOfLines={2}>{item.text ?? 'Branded PDF cover card. Open the reader for page controls and external fallback.'}</Text>
            {item.uri ? (
              <Pressable style={styles.openChip} onStartShouldSetResponder={() => true} onPress={() => {
                setPdfPage(1);
                setReaderOpen(true);
              }}>
                <Text style={styles.openChipText}>Read</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }
      case 'markdown': {
        const preview = (item.text ?? '').split(/\r?\n/).filter(Boolean).slice(0, 4).join('\n');
        return (
          <View style={styles.fileCard}>
            <Text style={styles.fileGlyph}>MARKDOWN</Text>
            <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.fileMeta} numberOfLines={4}>{preview || 'Markdown content preview unavailable.'}</Text>
            <Text style={styles.fileMeta}>{item.text?.length ? `${Math.round(item.text.length / 1024)} KB text` : 'No embedded text'}</Text>
            <Pressable style={styles.openChip} onStartShouldSetResponder={() => true} onPress={() => setReaderOpen(true)}>
              <Text style={styles.openChipText}>Preview</Text>
            </Pressable>
          </View>
        );
      }
      default:
        return null;
    }
  }, [
    editing,
    imageFailed,
    item,
    lowDetail,
    onChangeText,
    onEndEdit,
    onOpenUri,
    onMindChild,
    onMindCollapse,
    onMindSibling,
    onMindTidy,
    onToggleTask,
    canConnect,
    showText,
    selected,
    audioDuration,
    audioError,
    audioPlaying,
    audioPosition,
    markdownEditing,
    markdownQuery,
    pdfPage,
    pdfZoom,
    scrubberWidth,
    seekAudio,
    scrubAudio,
    toggleAudio,
  ]);

  const transparentBg = item.type === 'drawing' || item.type === 'shape' || item.type === 'region';
  const selectedGlow = selected
    ? {
        shadowColor: colors.selection,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.46,
        shadowRadius: 12,
        elevation: 8,
      }
    : null;

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={() => {
        if (item.locked) return;
        try {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        } catch {
          // Missing native haptics should not block editing.
        }
        onLongPress();
      }}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.item,
        !dense && item.type !== 'region' && shadows.card,
        dense && styles.denseShadow,
        selectedGlow,
        connectingActive && styles.connectingActive,
        {
          opacity: pressed ? 0.86 : 1,
          backgroundColor: transparentBg ? 'transparent' : item.backgroundColor ?? colors.paper,
          borderColor: selected ? colors.selection : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
        item.type === 'region' && styles.regionOuter,
        item.locked && styles.locked,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.type} item${selected ? ', selected' : ''}${item.locked ? ', locked' : ''}`}
      accessibilityHint={item.type === 'task' ? 'Task cards can be checked, edited, or connected to dependencies.' : undefined}
    >
      {content}
      {item.locked ? (
        <View style={styles.lockBadge} pointerEvents="none">
          <Text style={styles.lockBadgeText}>LOCKED</Text>
        </View>
      ) : null}
      {selected ? (
        <>
          {canConnect && !item.locked ? <ConnectorDots size={connectorSize} onPress={onConnectorPress} /> : null}
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, right: -handleSize / 2, top: -handleSize / 2 }]} />
          <View style={[styles.handle, { width: handleSize, height: handleSize, left: -handleSize / 2, bottom: -handleSize / 2 }]} />
          <Pressable
            style={[styles.handle, styles.resizeHandle, { width: handleSize + 8, height: handleSize + 8, right: -(handleSize + 8) / 2, bottom: -(handleSize + 8) / 2 }]}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => onResizeStart(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onResponderMove={(e) => onResizeMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onResponderRelease={(e) => onResizeEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onResponderTerminate={(e) => onResizeEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            accessibilityRole="adjustable"
            accessibilityLabel="Resize selected card"
          />
        </>
      ) : null}
      {readerOpen && (item.type === 'pdf' || item.type === 'markdown') ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setReaderOpen(false)} accessible accessibilityViewIsModal>
          <View style={styles.readerBackdrop}>
            <View style={styles.reader}>
              <Text style={styles.readerTitle}>{item.name}</Text>
              {item.type === 'pdf' ? (
                <View style={styles.readerBody}>
                  <Text style={styles.fileGlyph}>PDF reader</Text>
                  <Text style={styles.fileMeta}>Page {pdfPage} / {estimatedPdfPageCount(item)} · {Math.round(pdfZoom * 100)}% zoom</Text>
                  <View style={[styles.pdfPage, { transform: [{ scale: pdfZoom }] }]}>
                    <Text style={styles.pdfPageTitle}>{item.name}</Text>
                    <Text style={styles.pdfPageBody}>Page preview stub</Text>
                    <Text style={styles.pdfPageBody}>{item.text ?? 'Use Open externally for native search, selectable text, and full raster rendering.'}</Text>
                  </View>
                  <View style={styles.inlineControls}>
                    <Pressable style={styles.openChip} onPress={() => setPdfPage((page) => Math.max(1, page - 1))} accessibilityLabel="Previous PDF page">
                      <Text style={styles.openChipText}>Prev</Text>
                    </Pressable>
                    <Pressable style={styles.openChip} onPress={() => setPdfPage((page) => Math.min(estimatedPdfPageCount(item), page + 1))} accessibilityLabel="Next PDF page">
                      <Text style={styles.openChipText}>Next</Text>
                    </Pressable>
                    <Pressable style={styles.openChip} onPress={() => setPdfZoom((zoom) => Math.max(0.75, Number((zoom - 0.25).toFixed(2))))} accessibilityLabel="Zoom PDF out">
                      <Text style={styles.openChipText}>-</Text>
                    </Pressable>
                    <Pressable style={styles.openChip} onPress={() => setPdfZoom((zoom) => Math.min(2, Number((zoom + 0.25).toFixed(2))))} accessibilityLabel="Zoom PDF in">
                      <Text style={styles.openChipText}>+</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.openChip} onPress={() => onOpenUri(item.uri)} accessibilityLabel="Open PDF externally">
                    <Text style={styles.openChipText}>Open externally</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.inlineControls}>
                    <TextInput
                      value={markdownQuery}
                      onChangeText={setMarkdownQuery}
                      placeholder="Search Markdown"
                      placeholderTextColor={colors.mutedInk}
                      style={styles.readerSearch}
                    />
                    <Pressable style={styles.openChip} onPress={() => setMarkdownEditing((editingState) => !editingState)} accessibilityLabel="Toggle Markdown editing">
                      <Text style={styles.openChipText}>{markdownEditing ? 'Preview' : 'Edit'}</Text>
                    </Pressable>
                  </View>
                  {markdownEditing ? (
                    <TextInput
                      multiline
                      value={item.text ?? ''}
                      onChangeText={onChangeText}
                      style={styles.markdownEditor}
                      placeholder="Write Markdown..."
                      placeholderTextColor={colors.mutedInk}
                    />
                  ) : (
                <ScrollView style={styles.readerScroll}>
                  {markdownSections(item.text ?? '').filter((section) => {
                    const q = markdownQuery.trim().toLowerCase();
                    if (!q) return true;
                    return `${section.title}\n${section.body}`.toLowerCase().includes(q);
                  }).map((section) => (
                    <View key={section.title} style={styles.mdSection}>
                      <Pressable
                        onPress={() => setCollapsedMarkdown((prev) => ({ ...prev, [section.title]: !prev[section.title] }))}
                        accessibilityRole="button"
                        accessibilityLabel={`${collapsedMarkdown[section.title] ? 'Expand' : 'Collapse'} ${section.title}`}
                      >
                        <Text style={styles.mdHeading}>{collapsedMarkdown[section.title] ? '+' : '-'} {section.title}</Text>
                      </Pressable>
                      {!collapsedMarkdown[section.title] ? section.body.split(/\r?\n/).map(renderMarkdownLine) : null}
                    </View>
                  ))}
                </ScrollView>
                  )}
                </>
              )}
              <Pressable style={styles.readerClose} onPress={() => setReaderOpen(false)} accessibilityLabel="Close reader">
                <Text style={styles.openChipText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </Pressable>
  );
});

function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} onStartShouldSetResponder={() => true} style={styles.actionChip} accessibilityLabel={label}>
      <Text style={styles.actionChipText}>{label}</Text>
    </Pressable>
  );
}

function ConnectorDots({ size, onPress }: { size: number; onPress: (side: ConnectorSide) => void }) {
  const dot = { width: size, height: size, borderRadius: size / 2 };
  return (
    <>
      <Pressable style={[styles.connectorDot, dot, { left: -size / 2, top: '50%' }]} onStartShouldSetResponder={() => true} onPress={() => onPress('left')} accessibilityLabel="Connect from left side" />
      <Pressable style={[styles.connectorDot, dot, { right: -size / 2, top: '50%' }]} onStartShouldSetResponder={() => true} onPress={() => onPress('right')} accessibilityLabel="Connect from right side" />
      <Pressable style={[styles.connectorDot, dot, { top: -size / 2, left: '50%' }]} onStartShouldSetResponder={() => true} onPress={() => onPress('top')} accessibilityLabel="Connect from top side" />
      <Pressable style={[styles.connectorDot, dot, { bottom: -size / 2, left: '50%' }]} onStartShouldSetResponder={() => true} onPress={() => onPress('bottom')} accessibilityLabel="Connect from bottom side" />
    </>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '100%',
    height: '100%',
    borderRadius: radii.card,
    overflow: 'visible',
    padding: 18,
  },
  denseShadow: {
    elevation: 1,
  },
  locked: {
    borderStyle: 'dashed',
  },
  connectingActive: {
    borderWidth: 3,
    borderColor: colors.connector,
    shadowColor: colors.connector,
    shadowOpacity: 0.65,
    shadowRadius: 14,
  },
  text: {
    fontFamily: 'System',
  },
  detailHidden: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(52,38,29,0.08)',
  },
  image: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: radii.card,
  },
  imageFallback: {
    flex: 1,
    backgroundColor: '#e8dcc8',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
  },
  fallbackGlyph: { color: colors.ink, fontWeight: '800' },
  fallbackSub: { color: colors.mutedInk, fontSize: 12, textAlign: 'center' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxBlocked: {
    borderColor: colors.blocked,
    backgroundColor: 'rgba(200,101,69,0.16)',
  },
  checkMark: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  taskText: {
    color: colors.ink,
    fontSize: 20,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.mutedInk,
  },
  taskBlocked: {
    color: colors.blocked,
  },
  taskMeta: {
    color: colors.blocked,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  readyText: { color: colors.ready },
  doneText: { color: colors.success },
  mindmap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mindmapHub: {
    backgroundColor: colors.paperStrong,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 3,
  },
  mindmapHubText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    minWidth: 80,
  },
  mindmapActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  actionChip: {
    backgroundColor: colors.walnut,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionChipText: {
    color: colors.cream,
    fontSize: 10,
    fontWeight: '700',
  },
  regionOuter: {
    padding: 0,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(52,38,29,0.28)',
    backgroundColor: 'rgba(233,178,127,0.12)',
  },
  region: {
    flex: 1,
    padding: 14,
    overflow: 'hidden',
  },
  regionLabel: {
    color: colors.mutedInk,
    fontWeight: '800',
    fontSize: 16,
  },
  fileCard: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  fileGlyph: {
    color: colors.clayDeep,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fileName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  fileMeta: {
    color: colors.mutedInk,
    fontSize: 12,
  },
  pdfCover: {
    backgroundColor: 'rgba(203,125,70,0.09)',
    borderRadius: 14,
    padding: 10,
  },
  pdfPreview: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 17,
  },
  scrubber: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(52,38,29,0.14)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scrubberFill: {
    height: 7,
    backgroundColor: colors.clayDeep,
  },
  inlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  errorText: {
    color: colors.blocked,
    fontSize: 11,
    fontWeight: '700',
  },
  openChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.walnut,
    justifyContent: 'center',
  },
  openChipText: {
    color: colors.cream,
    fontSize: 11,
    fontWeight: '800',
  },
  lockBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.walnut,
  },
  lockBadgeText: {
    color: colors.cream,
    fontSize: 9,
    fontWeight: '900',
  },
  handle: {
    position: 'absolute',
    backgroundColor: colors.paperStrong,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    zIndex: 5,
  },
  resizeHandle: {
    backgroundColor: colors.selection,
    borderColor: colors.walnut,
    zIndex: 8,
  },
  connectorDot: {
    position: 'absolute',
    backgroundColor: colors.selection,
    borderWidth: 2,
    borderColor: colors.walnut,
    zIndex: 6,
    transform: [{ scale: 1.2 }],
  },
  readerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  reader: {
    width: '92%',
    maxHeight: '84%',
    backgroundColor: colors.paperStrong,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  readerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  readerBody: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  pdfPage: {
    minHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.12)',
    backgroundColor: '#fffaf0',
    padding: 16,
    gap: 10,
  },
  pdfPageTitle: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 16,
  },
  pdfPageBody: {
    color: colors.mutedInk,
    lineHeight: 20,
  },
  readerScroll: {
    maxHeight: 420,
  },
  readerSearch: {
    flex: 1,
    minWidth: 170,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: 'rgba(52,38,29,0.1)',
    color: colors.ink,
    paddingHorizontal: 12,
  },
  markdownEditor: {
    minHeight: 280,
    maxHeight: 460,
    borderRadius: 12,
    backgroundColor: colors.paper,
    color: colors.ink,
    padding: 12,
    textAlignVertical: 'top',
  },
  readerClose: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.walnut,
    justifyContent: 'center',
  },
  mdSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52,38,29,0.1)',
    gap: 6,
  },
  mdHeading: {
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
  },
  mdBody: {
    color: colors.mutedInk,
    lineHeight: 20,
  },
  mdQuote: {
    color: colors.ink,
    lineHeight: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.clayDeep,
    paddingLeft: 8,
  },
  mdSpacer: {
    height: 8,
  },
});
