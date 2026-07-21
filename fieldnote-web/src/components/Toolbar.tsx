import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Ellipsis,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { useFieldnote } from '../store/useFieldnote';
import { placement } from '../lib/placement';
import { TOOLBAR_W, COLORS, PALETTE } from '../lib/theme';
import type { Panel, Tool } from '../types';

type RailItem =
  | { key: string; label: string; panel: Panel; icon: ReactNode }
  | { key: string; label: string; tool: Tool; icon: ReactNode };

export function Toolbar() {
  const {
    tool,
    panel,
    selectedIds,
    prefs,
    setPanel,
    setTool,
    setPrefs,
    viewport,
    clearSelection,
  } = useFieldnote();

  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, px: 0, py: 0, moved: false });
  const pos = prefs.toolbar;

  useEffect(() => {
    placement.setViewport(viewport.w, viewport.h, {
      t: 0,
      r: 0,
      b: 0,
      l: 0,
    });
    placement.register('toolbar', {
      x: pos.x,
      y: pos.y,
      w: pos.collapsed ? 48 : TOOLBAR_W,
      h: pos.collapsed ? 48 : 420,
    });
  }, [pos, viewport]);

  const items: RailItem[] = [
    { key: 'add', label: 'Add', panel: 'add', icon: <Sparkles size={18} /> },
    { key: 'files', label: 'Files', panel: 'files', icon: <FolderOpen size={18} /> },
    { key: 'multi', label: 'Multi', tool: 'multi', icon: <CheckSquare size={18} /> },
    { key: 'draw', label: 'Draw', tool: 'draw', icon: <Pencil size={18} /> },
    { key: 'find', label: 'Find', panel: 'find', icon: <Search size={18} /> },
    { key: 'more', label: 'More', panel: 'more', icon: <Ellipsis size={18} /> },
  ];

  const onGripDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = {
      x: pos.x,
      y: pos.y,
      px: e.clientX,
      py: e.clientY,
      moved: false,
    };
    setDragging(true);
  };

  const onGripMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragOrigin.current.px;
    const dy = e.clientY - dragOrigin.current.py;
    if (!dragOrigin.current.moved && Math.hypot(dx, dy) < 10) return;
    dragOrigin.current.moved = true;
    setPrefs({
      toolbar: {
        ...pos,
        x: dragOrigin.current.x + dx,
        y: dragOrigin.current.y + dy,
      },
    });
  };

  const onGripUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (!dragOrigin.current.moved) return;
    const snapped = placement.snapToolbar(pos.x, pos.y, TOOLBAR_W, 400);
    setPrefs({ toolbar: { ...pos, ...snapped } });
  };

  if (pos.collapsed) {
    return (
      <button
        type="button"
        aria-label="Show tools"
        className="fixed z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--walnut)] text-[var(--cream)] shadow-xl"
        style={{ left: pos.x, top: pos.y }}
        onClick={() => setPrefs({ toolbar: { ...pos, collapsed: false } })}
      >
        <MoreHorizontal size={18} />
      </button>
    );
  }

  return (
    <motion.aside
      className="fixed z-40 flex w-[54px] flex-col gap-1 rounded-[18px] border border-white/15 bg-[var(--walnut)] p-1.5 text-[var(--cream)] shadow-[0_14px_42px_rgba(37,25,17,0.35)]"
      style={{ left: pos.x, top: pos.y }}
      layout
    >
      <div className="flex items-center justify-center gap-0.5 pb-1">
        <button
          type="button"
          aria-label="Move toolbar"
          className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-xl text-white/70"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
          onPointerCancel={onGripUp}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          aria-label="Hide tools"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70"
          onClick={() => setPrefs({ toolbar: { ...pos, collapsed: true } })}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {items.map((item) => {
        const active =
          ('panel' in item && panel === item.panel) ||
          ('tool' in item && tool === item.tool);
        const multiCount = item.key === 'multi' ? selectedIds.length : 0;
        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-pressed={active}
            className={`relative flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-1.5 text-[8px] font-semibold tracking-wide ${
              active ? 'bg-[rgba(203,125,70,0.55)] text-[var(--cream)]' : 'text-white/80'
            }`}
            onClick={() => {
              if ('panel' in item) {
                setPanel(panel === item.panel ? null : item.panel);
                if (item.panel === 'add') clearSelection();
              } else {
                setTool(tool === item.tool ? 'select' : item.tool);
              }
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {multiCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-[var(--clay-deep)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--cream)]">
                {multiCount}
              </span>
            )}
          </button>
        );
      })}

      {/* Collapsible color palette tab */}
      <PaletteTab />
    </motion.aside>
  );
}

function PaletteTab() {
  const { selectedIds, objects, prefs, setPrefs, tool, panel } = useFieldnote();
  const drawing = tool === 'draw' || panel === 'draw';
  const selected = objects.filter((o) => selectedIds.includes(o.id));
  const colorable =
    drawing ||
    selected.length > 0 &&
    selected.some((o) =>
      ['text', 'task', 'region', 'mindmap', 'shape', 'connector', 'drawing'].includes(o.type),
    );

  if (!colorable && !prefs.paletteOpen) {
    return (
      <button
        type="button"
        aria-label="Color palette"
        disabled
        className="mx-auto mt-1 h-8 w-3 rounded-full bg-white/10 opacity-40"
      />
    );
  }

  const open = prefs.paletteOpen && colorable;

  return (
    <div className="relative mt-1 flex flex-col items-center">
      <button
        type="button"
        aria-label="Toggle color palette"
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        onClick={() => setPrefs({ paletteOpen: !prefs.paletteOpen })}
        style={{
          background: open ? 'rgba(255,255,255,0.12)' : 'transparent',
        }}
      >
        <span
          className="block h-7 w-2.5 rounded-full"
          style={{
            background: `linear-gradient(180deg, ${COLORS.clay}, ${COLORS.clayDeep})`,
            boxShadow: open ? `0 0 0 2px ${COLORS.amber}` : undefined,
          }}
        />
      </button>
    </div>
  );
}

export function ColorPalette() {
  const { prefs, selectedIds, objects, viewport, tool, panel } = useFieldnote();
  const drawing = tool === 'draw' || panel === 'draw';
  const colorable =
    drawing ||
    selectedIds.length > 0 &&
    objects.some(
      (o) =>
        selectedIds.includes(o.id) &&
        ['text', 'task', 'region', 'mindmap', 'shape', 'connector'].includes(o.type),
    );
  const open = prefs.paletteOpen && colorable;
  if (!open) return null;

  const toolbar = prefs.toolbar;
  const onLeft = toolbar.x < viewport.w / 2;
  const x = onLeft ? toolbar.x + TOOLBAR_W + 8 : toolbar.x - 56;
  const y = toolbar.y;

  return <PaletteBody x={x} y={y} />;
}

function PaletteBody({ x, y }: { x: number; y: number }) {
  const { prefs, setObjectColor, setPrefs } = useFieldnote();

  useEffect(() => {
    placement.register('palette', { x, y, w: 52, h: 320 });
    return () => placement.unregister('palette');
  }, [x, y]);

  return (
    <div
      className="fixed z-40 flex max-h-[min(56vh,420px)] w-[52px] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[var(--walnut)] p-2 shadow-xl"
      style={{ left: Math.max(8, x), top: Math.max(8, y), WebkitOverflowScrolling: 'touch' }}
    >
      <div className="mb-1 text-center text-[8px] font-bold tracking-wider text-white/50">COLOR</div>
      {PALETTE.map((c) => {
        const active = prefs.lastColor === c;
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl"
            onClick={() => {
              setObjectColor(c);
              setPrefs({ lastColor: c });
            }}
          >
            <span
              className="block h-8 w-8 rounded-full"
              style={{
                background: c,
                boxShadow: active
                  ? `0 0 0 3px ${COLORS.cream}, 0 0 0 5px ${COLORS.clayDeep}`
                  : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
