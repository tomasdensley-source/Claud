import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BoardProvider, useBoard } from './src/store/BoardContext';
import { InfiniteCanvas, useViewportSize } from './src/components/InfiniteCanvas';
import { Toolbar } from './src/components/Toolbar';
import { ZoomControls } from './src/components/ZoomControls';
import { Minimap } from './src/components/Minimap';
import { BoardBadge } from './src/components/BoardBadge';
import { DrawPalette } from './src/components/DrawPalette';
import { VerticalColorPalette } from './src/components/VerticalColorPalette';
import { ContextualAddMenu } from './src/components/ContextualAddMenu';
import { Toast } from './src/components/Toast';
import { AddPanel } from './src/components/panels/AddPanel';
import { BoardsPanel } from './src/components/panels/BoardsPanel';
import { FilesPanel } from './src/components/panels/FilesPanel';
import { SearchPanel } from './src/components/panels/SearchPanel';
import { GesturesPanel, MorePanel, StoragePanel } from './src/components/panels/MorePanel';
import { PasteAiPanel, ExportCanvasPanel } from './src/components/panels/PasteAiPanel';
import { colors } from './src/theme';
import { MAX_SCALE, MIN_SCALE, clampScale } from './src/lib/camera';
import { ColorTarget } from './src/lib/colorManager';
import { pickAndBuildFileItems, pickAndBuildPhotoItems } from './src/lib/files';
import { placeAtPoint } from './src/lib/placement';

class ErrorBoundary extends Component<
  { children: ReactNode },
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
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.retryText}>Try again</Text>
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
    tool,
    drawColor,
    drawWidth,
    setDrawColor,
    setDrawWidth,
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    bringToFront,
    sendToBack,
    addItem,
    addItems,
    applyColorToSelected,
  } = useBoard();
  const { width, height } = useViewportSize();
  const [scale, setScale] = useState(0.7);
  const [cameraCenter, setCameraCenter] = useState({ x: 700, y: 500 });
  const [toast, setToast] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<ColorTarget>('body');
  const [contextual, setContextual] = useState<{
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [zoomRequest, setZoomRequest] = useState<{ scale: number; token: number } | null>(null);
  const [centerRequest, setCenterRequest] = useState<{
    x: number;
    y: number;
    token: number;
  } | null>(null);

  const requestZoom = useCallback((next: number) => {
    setZoomRequest({ scale: clampScale(next), token: Date.now() });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  const paletteLit = tool === 'draw' || selectedIds.length > 0;

  const onColor = useCallback(
    (c: string) => {
      setDrawColor(c);
      if (selectedIds.length > 0) applyColorToSelected(c, colorTarget);
    },
    [applyColorToSelected, colorTarget, selectedIds.length, setDrawColor],
  );

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
        <ErrorBoundary>
          <InfiniteCanvas
            viewportWidth={width}
            viewportHeight={height}
            onScaleChange={setScale}
            onCameraCenterChange={setCameraCenter}
            onToast={showToast}
            onContextualAdd={(req) => setContextual(req)}
            fitRequest={fitRequest}
            zoomRequest={zoomRequest}
            centerRequest={centerRequest}
          />
        </ErrorBoundary>
        <BoardBadge />
        <Toolbar />
        <VerticalColorPalette
          lit={paletteLit}
          color={drawColor}
          target={colorTarget}
          onColor={onColor}
          onTarget={setColorTarget}
        />
        <Minimap
          items={currentBoard.items}
          onNavigate={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
          onFit={() => setFitRequest((n) => n + 1)}
        />
        {tool === 'draw' ? (
          <DrawPalette
            color={drawColor}
            width={drawWidth}
            onColor={setDrawColor}
            onWidth={setDrawWidth}
          />
        ) : null}
        <ZoomControls
          scale={scale}
          selectedCount={selectedIds.length}
          canUndo={canUndo}
          canRedo={canRedo}
          onZoomIn={() => requestZoom(scale * 1.15)}
          onZoomOut={() => requestZoom(scale / 1.15)}
          onResetZoom={() => requestZoom(1)}
          onFit={() => setFitRequest((n) => n + 1)}
          onDuplicate={() => {
            duplicateSelected();
            showToast('Duplicated');
          }}
          onDelete={() => {
            deleteSelected();
            showToast('Deleted');
          }}
          onUndo={undo}
          onRedo={redo}
          onBringFront={bringToFront}
          onSendBack={sendToBack}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
        />
        <Toast message={toast} onDone={() => setToast(null)} onUndo={canUndo ? undo : undefined} />
        <ContextualAddMenu
          visible={contextual != null}
          x={contextual?.screenX ?? 0}
          y={contextual?.screenY ?? 0}
          onClose={() => setContextual(null)}
          onInternal={() => {
            setContextual(null);
            setPanel('files');
          }}
          onDevice={async () => {
            const anchor = contextual
              ? { x: contextual.worldX, y: contextual.worldY }
              : cameraCenter;
            setContextual(null);
            Alert.alert('From device', undefined, [
              {
                text: 'Files',
                onPress: async () => {
                  try {
                    const items = await pickAndBuildFileItems(anchor);
                    if (!items.length) return;
                    addItems(items);
                    showToast(items.length === 1 ? 'File placed' : `${items.length} files placed`);
                  } catch (e) {
                    Alert.alert('Could not open files', String(e));
                  }
                },
              },
              {
                text: 'Photos',
                onPress: async () => {
                  try {
                    const items = await pickAndBuildPhotoItems(anchor);
                    if (!items.length) return;
                    addItems(items);
                    showToast(items.length === 1 ? 'Photo placed' : `${items.length} photos placed`);
                  } catch (e) {
                    Alert.alert('Could not open photos', String(e));
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
          onNewObject={() => {
            const anchor = contextual
              ? { x: contextual.worldX, y: contextual.worldY }
              : cameraCenter;
            setContextual(null);
            Alert.alert('New object', undefined, [
              {
                text: 'Text',
                onPress: () => {
                  const { x, y } = placeAtPoint(anchor, 300, 140);
                  addItem({
                    type: 'text',
                    x,
                    y,
                    width: 300,
                    height: 140,
                    backgroundColor: colors.paper,
                    color: colors.ink,
                    text: '',
                    fontSize: 22,
                    role: 'body',
                    markdown: true,
                  });
                  showToast('Note added');
                },
              },
              {
                text: 'Task',
                onPress: () => {
                  const { x, y } = placeAtPoint(anchor, 280, 100);
                  addItem({
                    type: 'task',
                    x,
                    y,
                    width: 280,
                    height: 100,
                    backgroundColor: colors.paperStrong,
                    text: 'New task',
                    done: false,
                    dependsOn: [],
                  });
                  showToast('Task added');
                },
              },
              {
                text: 'More…',
                onPress: () => setPanel('add'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        />

        <AddPanel
          visible={panel === 'add'}
          onClose={() => setPanel(null)}
          viewCenter={cameraCenter}
          onPlaced={(label) => showToast(label)}
        />
        <BoardsPanel visible={panel === 'boards'} onClose={() => setPanel(null)} />
        <FilesPanel
          visible={panel === 'files'}
          onClose={() => setPanel(null)}
          viewCenter={cameraCenter}
          onFocusItem={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
          onPlaced={(label) => showToast(label)}
        />
        <SearchPanel
          visible={panel === 'search'}
          onClose={() => setPanel(null)}
          onFocusItem={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
        />
        <MorePanel visible={panel === 'more'} onClose={() => setPanel(null)} />
        <GesturesPanel visible={panel === 'gestures'} onClose={() => setPanel(null)} />
        <StoragePanel visible={panel === 'storage'} onClose={() => setPanel(null)} />
        <PasteAiPanel
          visible={panel === 'pasteAi'}
          onClose={() => setPanel(null)}
          onToast={showToast}
        />
        <ExportCanvasPanel
          visible={panel === 'export'}
          onClose={() => setPanel(null)}
          onToast={showToast}
        />
      </View>
    </SafeAreaView>
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
});
