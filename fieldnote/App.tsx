import React, { Component, ErrorInfo, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BoardProvider, useBoard } from './src/store/BoardContext';
import { InfiniteCanvas, useViewportSize } from './src/components/InfiniteCanvas';
import { Toolbar } from './src/components/Toolbar';
import { ZoomControls } from './src/components/ZoomControls';
import { Minimap } from './src/components/Minimap';
import { BoardBadge } from './src/components/BoardBadge';
import { AddPanel } from './src/components/panels/AddPanel';
import { BoardsPanel } from './src/components/panels/BoardsPanel';
import { FilesPanel } from './src/components/panels/FilesPanel';
import { SearchPanel } from './src/components/panels/SearchPanel';
import { GesturesPanel, MorePanel, StoragePanel } from './src/components/panels/MorePanel';
import { loadOnboardingDismissed, saveOnboardingDismissed } from './src/lib/storage';
import { colors, PALETTE } from './src/theme';

class ErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fieldnote crash', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Something went wrong</Text>
          <Text style={styles.loadingSub}>{this.state.error.message}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => {
              this.props.onReset?.();
              this.setState({ error: null });
            }}
          >
            <Text style={styles.retryText}>Reset to board</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function FieldnoteApp() {
  const {
    ready,
    currentBoard,
    selectedIds,
    panel,
    setPanel,
    setTool,
    tool,
    drawColor,
    drawWidth,
    drawMode,
    setDrawColor,
    setDrawWidth,
    setDrawMode,
    formatSelected,
    copySelection,
    pasteSelection,
    lockSelected,
    deleteSelected,
    duplicateSelected,
    toast,
    dismissToast,
  } = useBoard();
  const { width, height } = useViewportSize();
  const [scale, setScale] = useState(0.7);
  const [fitRequest, setFitRequest] = useState(0);
  const [fitSelectionRequest, setFitSelectionRequest] = useState(0);
  const [zoomRequest, setZoomRequest] = useState<{ scale: number; token: number } | null>(null);
  const [centerRequest, setCenterRequest] = useState<{
    x: number;
    y: number;
    token: number;
  } | null>(null);
  const [cameraCenter, setCameraCenter] = useState({ x: 600, y: 400 });
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    void loadOnboardingDismissed().then((dismissed) => setShowOnboarding(!dismissed));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (panel) {
        setPanel(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [panel, setPanel]);

  const viewCenter = useMemo(() => {
    if (currentBoard.items.length === 0) {
      return cameraCenter;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    currentBoard.items.forEach((it) => {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + it.width);
      maxY = Math.max(maxY, it.y + it.height);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }, [cameraCenter, currentBoard.items]);

  const requestZoom = useCallback((next: number) => {
    setZoomRequest({ scale: Math.min(2.8, Math.max(0.2, next)), token: Date.now() });
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.clayDeep} />
        <Text style={styles.loadingText}>Opening your local board</Text>
        <Text style={styles.loadingSub}>Waiting before editing protects your saved work.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <ErrorBoundary onReset={() => {
          setTool('select');
          setPanel(null);
        }}>
          <InfiniteCanvas
            viewportWidth={width}
            viewportHeight={height}
            onScaleChange={setScale}
            onCameraChange={setCameraCenter}
            fitRequest={fitRequest}
            fitSelectionRequest={fitSelectionRequest}
            zoomRequest={zoomRequest}
            centerRequest={centerRequest}
          />
        </ErrorBoundary>
        <BoardBadge />
        <Toolbar />
        <Minimap
          items={currentBoard.items}
          selectedIds={selectedIds}
          onNavigate={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
          onFit={() => setFitRequest((n) => n + 1)}
        />
        <PaletteStrip
          visible={tool === 'draw' || selectedIds.length > 0}
          drawColor={drawColor}
          drawWidth={drawWidth}
          drawMode={drawMode}
          onColor={(color) => {
            setDrawColor(color);
            if (selectedIds.length) formatSelected({ backgroundColor: color });
          }}
          onWidth={setDrawWidth}
          onMode={setDrawMode}
        />
        <ZoomControls
          scale={scale}
          selectedCount={selectedIds.length}
          onZoomIn={() => requestZoom(scale * 1.15)}
          onZoomOut={() => requestZoom(scale / 1.15)}
          onResetZoom={() => requestZoom(1)}
          onFit={() => setFitRequest((n) => n + 1)}
          onFitSelection={() => setFitSelectionRequest((n) => n + 1)}
          onDuplicate={duplicateSelected}
          onDelete={() => {
            if (selectedIds.length > 1) {
              Alert.alert('Delete selected items?', `${selectedIds.length} items will be removed.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: deleteSelected },
              ]);
            } else deleteSelected();
          }}
          onCopy={copySelection}
          onPaste={pasteSelection}
          onLock={() => lockSelected(true)}
        />
        {currentBoard.items.length === 0 ? (
          <Pressable style={styles.centerAdd} onPress={() => setPanel('add')} accessibilityLabel="Add first item">
            <Text style={styles.centerAddText}>Add first item</Text>
          </Pressable>
        ) : null}
        {showOnboarding ? (
          <View style={styles.onboarding}>
            <Text style={styles.onboardingTitle}>Welcome to Fieldnote</Text>
            <Text style={styles.onboardingBody}>Double tap empty space to add, pinch with two fingers to navigate, and use Multi to marquee select.</Text>
            <View style={styles.onboardingActions}>
              <Pressable
                style={styles.tipBtn}
                onPress={() => {
                  void saveOnboardingDismissed();
                  setShowOnboarding(false);
                }}
              >
                <Text style={styles.tipBtnText}>Skip tips</Text>
              </Pressable>
              <Pressable style={styles.tipBtnPrimary} onPress={() => setPanel('gestures')}>
                <Text style={styles.tipBtnPrimaryText}>Show gestures</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <ToastHost toast={toast} onDismiss={dismissToast} />

        <AddPanel
          visible={panel === 'add'}
          onClose={() => setPanel(null)}
          viewCenter={viewCenter}
        />
        <BoardsPanel visible={panel === 'boards'} onClose={() => setPanel(null)} />
        <FilesPanel
          visible={panel === 'files'}
          onClose={() => setPanel(null)}
          viewCenter={viewCenter}
        />
        <SearchPanel
          visible={panel === 'search'}
          onClose={() => setPanel(null)}
          onFocusItem={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
        />
        <MorePanel visible={panel === 'more'} onClose={() => setPanel(null)} />
        <GesturesPanel visible={panel === 'gestures'} onClose={() => setPanel(null)} />
        <StoragePanel visible={panel === 'storage'} onClose={() => setPanel(null)} />
      </View>
    </SafeAreaView>
  );
}

function PaletteStrip({
  visible,
  drawColor,
  drawWidth,
  drawMode,
  onColor,
  onWidth,
  onMode,
}: {
  visible: boolean;
  drawColor: string;
  drawWidth: number;
  drawMode: 'pen' | 'highlighter' | 'eraser';
  onColor: (color: string) => void;
  onWidth: (width: number) => void;
  onMode: (mode: 'pen' | 'highlighter' | 'eraser') => void;
}) {
  if (!visible) return null;
  return (
    <View style={styles.palette}>
      {PALETTE.map((color) => (
        <Pressable
          key={color}
          onPress={() => onColor(color)}
          style={[styles.swatch, { backgroundColor: color }, drawColor === color && styles.swatchActive]}
          accessibilityLabel={`Use color ${color}`}
          hitSlop={6}
        />
      ))}
      <View style={styles.paletteDivider} />
      {[2, 3, 6, 10].map((width) => (
        <Pressable key={width} style={[styles.widthBtn, drawWidth === width && styles.widthBtnActive]} onPress={() => onWidth(width)} accessibilityLabel={`Draw width ${width}`}>
          <Text style={styles.widthText}>{width}</Text>
        </Pressable>
      ))}
      {(['pen', 'highlighter', 'eraser'] as const).map((mode) => (
        <Pressable key={mode} style={[styles.modeBtn, drawMode === mode && styles.modeBtnActive]} onPress={() => onMode(mode)} accessibilityLabel={`Draw mode ${mode}`}>
          <Text style={styles.modeText}>{mode[0]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToastHost({ toast, onDismiss }: { toast: ReturnType<typeof useBoard>['toast']; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <Pressable style={styles.toast} onPress={onDismiss} accessibilityLabel="Dismiss notification">
      <Text style={styles.toastText}>{toast.text}</Text>
      {toast.action ? (
        <Pressable
          style={styles.toastAction}
          onPress={() => {
            toast.action?.();
            onDismiss();
          }}
        >
          <Text style={styles.toastActionText}>{toast.actionLabel ?? 'Undo'}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <BoardProvider>
            <FieldnoteApp />
          </BoardProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  loadingText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingSub: {
    color: colors.mutedInk,
    textAlign: 'center',
  },
  retry: {
    marginTop: 16,
    backgroundColor: colors.clayDeep,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: colors.cream,
    fontWeight: '700',
  },
  palette: {
    position: 'absolute',
    right: 12,
    top: 170,
    backgroundColor: colors.walnut,
    borderRadius: 18,
    padding: 8,
    gap: 8,
    zIndex: 42,
    alignItems: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: colors.selection,
  },
  paletteDivider: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  widthBtn: {
    width: 30,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthBtnActive: { backgroundColor: 'rgba(238,177,116,0.32)' },
  widthText: { color: colors.cream, fontSize: 11, fontWeight: '800' },
  modeBtn: {
    width: 30,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,240,0.08)',
  },
  modeBtnActive: { backgroundColor: colors.clayDeep },
  modeText: { color: colors.cream, fontSize: 11, fontWeight: '900' },
  centerAdd: {
    position: 'absolute',
    alignSelf: 'center',
    top: '55%',
    backgroundColor: colors.clayDeep,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    zIndex: 36,
  },
  centerAddText: { color: colors.cream, fontWeight: '800' },
  onboarding: {
    position: 'absolute',
    left: 86,
    right: 132,
    bottom: 18,
    backgroundColor: colors.tipBlue,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    zIndex: 44,
  },
  onboardingTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  onboardingBody: { color: colors.mutedInk, lineHeight: 19 },
  onboardingActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.paperStrong,
  },
  tipBtnText: { color: colors.ink, fontWeight: '700' },
  tipBtnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.walnut,
  },
  tipBtnPrimaryText: { color: colors.cream, fontWeight: '700' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 24,
    maxWidth: '84%',
    backgroundColor: colors.walnut,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 60,
  },
  toastText: { color: colors.cream, fontWeight: '700', flexShrink: 1 },
  toastAction: {
    backgroundColor: colors.clayDeep,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toastActionText: { color: colors.cream, fontWeight: '900' },
});
