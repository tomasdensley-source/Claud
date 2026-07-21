import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  FileText,
  GitBranchPlus,
  Layers,
  Lock,
  Maximize2,
  Music,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useFieldnote } from '../store/useFieldnote';
import { placement } from '../lib/placement';
import type { BoardObject } from '../types';

const TOOLBAR_ID = 'object-toolbar';
const TOOLBAR_W = 340;

export function ObjectToolbar() {
  const {
    objects,
    selectedIds,
    editingId,
    camera,
    viewport,
    setPanel,
    duplicateSelected,
    deleteSelected,
    copySelection,
    toggleMindCollapse,
    addMindChild,
    addMindSibling,
    tidyMindMap,
    simplifyMindDepth,
    setRegionProps,
    setPdfReader,
    openMarkdown,
    openAudio,
  } = useFieldnote();

  const selected = useMemo(() => {
    if (selectedIds.length !== 1 || editingId) return null;
    return objects.find((obj) => obj.id === selectedIds[0] && obj.type !== 'connector') ?? null;
  }, [editingId, objects, selectedIds]);

  const rect = useMemo(() => {
    if (!selected) return null;
    const bounds = screenBounds(selected, camera);
    const actionCount = actionLabels(selected).length;
    const h = actionCount > 5 ? 106 : 58;
    const topDot = {
      id: `${selected.id}-top-dot`,
      x: bounds.x + bounds.w / 2 - 24,
      y: bounds.y - 26,
      w: 48,
      h: 52,
    };
    return placement.place({
      id: TOOLBAR_ID,
      w: Math.min(TOOLBAR_W, viewport.w - 16),
      h,
      prefer: 'tr',
      anchor: { x: bounds.x + bounds.w, y: bounds.y - h - 10 },
      protect: [topDot],
    });
  }, [camera, selected, viewport]);

  useEffect(() => {
    if (!selected) placement.unregister(TOOLBAR_ID);
    return () => placement.unregister(TOOLBAR_ID);
  }, [selected]);

  if (!selected || !rect) return null;

  const cyclePattern = () => {
    if (selected.type !== 'region') return;
    const next = selected.pattern === 'dots' ? 'grid' : selected.pattern === 'grid' ? 'solid' : 'dots';
    setRegionProps(selected.id, { pattern: next });
  };

  const cycleOpacity = () => {
    if (selected.type !== 'region') return;
    const current = selected.opacity ?? 1;
    const next = current === 1 ? 0.7 : current === 0.7 ? 0.4 : 1;
    setRegionProps(selected.id, { opacity: next });
  };

  return (
    <motion.div
      className="fixed z-[45] flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-1 rounded-2xl border border-white/15 bg-[var(--walnut)] p-1.5 text-[var(--cream)] shadow-2xl"
      style={{ left: rect.x, top: rect.y, width: rect.w }}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
    >
      {selected.type === 'text' && (
        <>
          <ToolButton icon={<Pencil size={15} />} label="Format" onClick={() => setPanel('textFormat')} />
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Copy size={15} />} label="Copy" onClick={copySelection} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'task' && (
        <>
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Copy size={15} />} label="Copy" onClick={copySelection} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'mindmap' && (
        <>
          <ToolButton
            icon={<Maximize2 size={15} />}
            label={selected.collapsed ? 'Expand' : 'Collapse'}
            onClick={() => toggleMindCollapse(selected.id)}
          />
          <ToolButton icon={<Plus size={15} />} label="Add child" onClick={() => addMindChild(selected.id)} />
          <ToolButton icon={<GitBranchPlus size={15} />} label="Add sibling" onClick={() => addMindSibling(selected.id)} />
          <ToolButton icon={<Palette size={15} />} label="Tidy" onClick={() => tidyMindMap(selected.id)} />
          <ToolButton icon={<Layers size={15} />} label="Depth 2" onClick={() => simplifyMindDepth(selected.id, 2)} />
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'region' && (
        <>
          <ToolButton icon={<Palette size={15} />} label="Pattern" onClick={cyclePattern} />
          <ToolButton icon={<Layers size={15} />} label="Opacity" onClick={cycleOpacity} />
          <ToolButton
            icon={selected.locked ? <Unlock size={15} /> : <Lock size={15} />}
            label={selected.locked ? 'Unlock' : 'Lock'}
            onClick={() => setRegionProps(selected.id, { locked: !selected.locked })}
          />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'pdf' && (
        <>
          <ToolButton icon={<FileText size={15} />} label="Open reader" onClick={() => setPdfReader(selected.id)} />
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'markdown' && (
        <>
          <ToolButton icon={<FileText size={15} />} label="Open editor" onClick={() => openMarkdown(selected.id)} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {selected.type === 'audio' && (
        <>
          <ToolButton icon={<Music size={15} />} label="Play" onClick={() => openAudio(selected.id)} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {(selected.type === 'image' || selected.type === 'file') && (
        <>
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}

      {(selected.type === 'drawing' || selected.type === 'shape') && (
        <>
          <ToolButton icon={<Layers size={15} />} label="Duplicate" onClick={duplicateSelected} />
          <ToolButton icon={<Trash2 size={15} />} label="Delete" onClick={deleteSelected} />
        </>
      )}
    </motion.div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-white/90 hover:bg-white/10"
      onClick={onClick}
      aria-label={label}
    >
      {icon}
      {label}
    </button>
  );
}

function screenBounds(obj: BoardObject, camera: { x: number; y: number; scale: number }) {
  return {
    x: camera.x + obj.x * camera.scale,
    y: camera.y + obj.y * camera.scale,
    w: obj.width * camera.scale,
    h: obj.height * camera.scale,
  };
}

function actionLabels(obj: BoardObject): string[] {
  if (obj.type === 'text') return ['Format', 'Duplicate', 'Delete', 'Copy'];
  if (obj.type === 'task') return ['Duplicate', 'Delete', 'Copy'];
  if (obj.type === 'mindmap') return ['Collapse', 'Add child', 'Add sibling', 'Tidy', 'Depth 2', 'Duplicate', 'Delete'];
  if (obj.type === 'region') return ['Pattern', 'Opacity', 'Lock', 'Delete'];
  if (obj.type === 'pdf') return ['Open reader', 'Duplicate', 'Delete'];
  if (obj.type === 'markdown') return ['Open editor', 'Delete'];
  if (obj.type === 'audio') return ['Play', 'Delete'];
  if (obj.type === 'image' || obj.type === 'file') return ['Duplicate', 'Delete'];
  if (obj.type === 'drawing' || obj.type === 'shape') return ['Duplicate', 'Delete'];
  return [];
}
