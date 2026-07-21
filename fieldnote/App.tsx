import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import { colors } from './src/theme';

function FieldnoteApp() {
  const {
    ready,
    currentBoard,
    selectedIds,
    panel,
    setPanel,
    deleteSelected,
    duplicateSelected,
  } = useBoard();
  const { width, height } = useViewportSize();
  const [scale, setScale] = useState(0.86);
  const [fitRequest, setFitRequest] = useState(0);
  const [zoomRequest, setZoomRequest] = useState<{ scale: number; token: number } | null>(null);
  const [centerRequest, setCenterRequest] = useState<{
    x: number;
    y: number;
    token: number;
  } | null>(null);

  const viewCenter = useMemo(() => {
    // Approximate world center of current viewport using last known scale.
    // Pan offsets live inside InfiniteCanvas; for placement we use board content midpoint
    // as a stable fallback when adding items.
    if (currentBoard.items.length === 0) {
      return { x: 600, y: 400 };
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
  }, [currentBoard.items]);

  const requestZoom = useCallback((next: number) => {
    setZoomRequest({ scale: Math.min(2.5, Math.max(0.25, next)), token: Date.now() });
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
        <InfiniteCanvas
          viewportWidth={width}
          viewportHeight={height}
          onScaleChange={setScale}
          fitRequest={fitRequest}
          zoomRequest={zoomRequest}
          centerRequest={centerRequest}
        />
        <BoardBadge />
        <Toolbar />
        <Minimap
          items={currentBoard.items}
          onNavigate={(x, y) => setCenterRequest({ x, y, token: Date.now() })}
          onFit={() => setFitRequest((n) => n + 1)}
        />
        <ZoomControls
          scale={scale}
          selectedCount={selectedIds.length}
          onZoomIn={() => requestZoom(scale * 1.15)}
          onZoomOut={() => requestZoom(scale / 1.15)}
          onResetZoom={() => requestZoom(1)}
          onFit={() => setFitRequest((n) => n + 1)}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />

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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BoardProvider>
          <FieldnoteApp />
        </BoardProvider>
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
  },
  loadingSub: {
    color: colors.mutedInk,
    textAlign: 'center',
  },
});
