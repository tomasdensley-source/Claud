import { useEffect } from 'react';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { ColorPalette, Toolbar } from './components/Toolbar';
import { AddPanel } from './components/panels/AddPanel';
import { FilesPanel, FindPanel, MorePanel } from './components/panels/MorePanel';
import {
  BoardBadge,
  DrawPanel,
  EmptyStateAddButton,
  Minimap,
  TextFormatPanel,
  ToastHost,
  ZoomBar,
} from './components/Chrome';
import { MediaOverlays } from './components/MediaOverlays';
import { ObjectToolbar } from './components/ObjectToolbar';
import { useFieldnote } from './store/useFieldnote';
import { placement } from './lib/placement';

export default function App() {
  const bootstrap = useFieldnote((s) => s.bootstrap);
  const ready = useFieldnote((s) => s.ready);
  const viewport = useFieldnote((s) => s.viewport);
  const fitBoard = useFieldnote((s) => s.fitBoard);
  const undo = useFieldnote((s) => s.undo);
  const redo = useFieldnote((s) => s.redo);
  const fitSelection = useFieldnote((s) => s.fitSelection);
  const setPanel = useFieldnote((s) => s.setPanel);
  const select = useFieldnote((s) => s.select);
  const objects = useFieldnote((s) => s.objects);
  const deleteSelected = useFieldnote((s) => s.deleteSelected);
  const duplicateSelected = useFieldnote((s) => s.duplicateSelected);
  const copySelection = useFieldnote((s) => s.copySelection);
  const pasteClipboard = useFieldnote((s) => s.pasteClipboard);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    placement.setViewport(viewport.w, viewport.h);
    if (ready && viewport.w > 0) fitBoard(viewport.w, viewport.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (meta && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setPanel('find');
      }
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        select(
          objects.filter((o) => o.type !== 'connector').map((o) => o.id),
          false,
        );
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
      if (meta && e.key.toLowerCase() === 'c') {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        copySelection();
      }
      if (meta && e.key.toLowerCase() === 'v') {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        pasteClipboard();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        deleteSelected();
      }
      if (e.key.toLowerCase() === 'f' && !meta) fitBoard(viewport.w, viewport.h);
      if (e.key === '1' && !meta) useFieldnote.getState().setCamera({ scale: 1 });
      if (e.key === '?' ) setPanel('gestures');
      if (e.key.toLowerCase() === 's' && !meta) fitSelection(viewport.w, viewport.h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    undo,
    redo,
    setPanel,
    select,
    objects,
    deleteSelected,
    duplicateSelected,
    copySelection,
    pasteClipboard,
    fitBoard,
    fitSelection,
    viewport,
  ]);

  if (!ready) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--canvas)] px-6 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--clay-deep)] border-t-transparent" />
        <div className="text-lg font-bold text-[var(--ink)]">Opening your local board</div>
        <div className="text-sm text-[var(--muted)]">
          Waiting before editing protects your saved work.
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--canvas)]">
      <InfiniteCanvas />
      <BoardBadge />
      <Toolbar />
      <ColorPalette />
      <ObjectToolbar />
      <EmptyStateAddButton />
      <Minimap />
      <ZoomBar />
      <DrawPanel />
      <TextFormatPanel />
      <ToastHost />
      <AddPanel />
      <FilesPanel />
      <FindPanel />
      <MorePanel />
      <MediaOverlays />
      <div className="visually-hidden" role="status" aria-live="polite">
        Fieldnote ready
      </div>
    </div>
  );
}
