import { useEffect, useState } from 'react';
import { Copy, Maximize2, Minus, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFieldnote } from '../store/useFieldnote';
import { placement } from '../lib/placement';
import { COLORS, PALETTE } from '../lib/theme';

export function BoardBadge() {
  const { boards, currentId } = useFieldnote();
  const board = boards.find((b) => b.id === currentId);
  return (
    <div className="pointer-events-none absolute left-1/2 top-[max(12px,var(--safe-top))] z-30 -translate-x-1/2 rounded-full border border-black/5 bg-[var(--paper-strong)] px-4 py-2 shadow-md">
      <div className="text-[9px] font-bold tracking-[0.08em] text-[var(--muted)]">CURRENT BOARD</div>
      <div className="text-sm font-semibold text-[var(--ink)]">{board?.name ?? 'Board'}</div>
    </div>
  );
}

export function ZoomBar() {
  const {
    camera,
    setCamera,
    fitBoard,
    fitSelection,
    viewport,
    selectedIds,
    deleteSelected,
    duplicateSelected,
    clearSelection,
  } = useFieldnote();

  useEffect(() => {
    placement.register('zoom', {
      x: viewport.w - 280,
      y: viewport.h - 72,
      w: 260,
      h: 52,
    });
  }, [viewport]);

  return (
    <div className="absolute bottom-[max(16px,var(--safe-bottom))] right-3 z-30 flex flex-col items-end gap-2">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-[var(--walnut)] px-2 py-1 text-[var(--cream)] shadow-xl">
          <span className="px-2 text-xs text-white/75">{selectedIds.length} selected</span>
          <IconBtn label="Duplicate" onClick={duplicateSelected}>
            <Copy size={16} />
          </IconBtn>
          <IconBtn label="Delete" onClick={deleteSelected}>
            <Trash2 size={16} />
          </IconBtn>
          <IconBtn label="Clear selection" onClick={clearSelection}>
            <X size={16} />
          </IconBtn>
          <IconBtn label="Fit selection" onClick={() => fitSelection(viewport.w, viewport.h)}>
            <Maximize2 size={16} />
          </IconBtn>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-[var(--walnut)] px-1.5 py-1 text-[var(--cream)] shadow-xl">
        <IconBtn
          label="Zoom out"
          onClick={() => setCamera({ scale: Math.max(0.2, camera.scale / 1.15) })}
        >
          <Minus size={18} />
        </IconBtn>
        <button
          type="button"
          className="min-w-12 px-2 text-sm font-semibold"
          aria-label="Reset zoom to 100 percent"
          onClick={() => setCamera({ scale: 1 })}
        >
          {Math.round(camera.scale * 100)}%
        </button>
        <IconBtn
          label="Zoom in"
          onClick={() => setCamera({ scale: Math.min(2.8, camera.scale * 1.15) })}
        >
          <Plus size={18} />
        </IconBtn>
        <span className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          className="flex h-11 items-center gap-1.5 px-2 text-sm font-semibold"
          onClick={() => fitBoard(viewport.w, viewport.h)}
        >
          <Maximize2 size={16} />
          Fit board
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Minimap() {
  const { objects, camera, viewport, setCamera } = useFieldnote();
  const items = objects.filter((o) => o.type !== 'connector');
  let minX = 0,
    minY = 0,
    w = 1000,
    h = 800;
  if (items.length) {
    minX = Math.min(...items.map((i) => i.x));
    minY = Math.min(...items.map((i) => i.y));
    const maxX = Math.max(...items.map((i) => i.x + i.width));
    const maxY = Math.max(...items.map((i) => i.y + i.height));
    w = Math.max(200, maxX - minX + 80);
    h = Math.max(200, maxY - minY + 80);
    minX -= 40;
    minY -= 40;
  }

  const onNav = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const wx = minX + px * w;
    const wy = minY + py * h;
    setCamera({
      x: viewport.w / 2 - wx * camera.scale,
      y: viewport.h / 2 - wy * camera.scale,
    });
  };

  return (
    <button
      type="button"
      aria-label="Mini map"
      onClick={onNav}
      className="absolute right-3 top-[max(56px,calc(var(--safe-top)+48px))] z-30 h-[104px] w-[104px] overflow-hidden rounded-2xl border border-white/15 bg-[var(--walnut)] p-1.5 shadow-xl"
    >
      <div className="relative h-full w-full rounded-xl bg-white/5">
        {items.map((it) => (
          <span
            key={it.id}
            className="absolute rounded-sm"
            style={{
              left: `${((it.x - minX) / w) * 100}%`,
              top: `${((it.y - minY) / h) * 100}%`,
              width: `${Math.max(4, (it.width / w) * 100)}%`,
              height: `${Math.max(3, (it.height / h) * 100)}%`,
              background:
                it.type === 'image' || it.type === 'pdf'
                  ? '#8aa4b0'
                  : it.type === 'task'
                    ? COLORS.glow
                    : it.type === 'mindmap'
                      ? (it as { branchColor?: string }).branchColor ?? COLORS.clay
                      : it.fill === COLORS.clay
                        ? COLORS.clay
                        : '#d9c6a8',
            }}
          />
        ))}
      </div>
    </button>
  );
}

export function ToastHost() {
  const { toast, setToast, undo } = useFieldnote();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[var(--walnut)] px-3 py-2 text-sm text-[var(--cream)] shadow-xl"
        >
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyStateAddButton() {
  const { objects, setPanel } = useFieldnote();
  const empty = objects.filter((obj) => obj.type !== 'connector').length === 0;
  if (!empty) return null;

  return (
    <motion.button
      type="button"
      className="absolute bottom-[max(92px,calc(var(--safe-bottom)+88px))] left-1/2 z-[35] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--clay-deep)] px-5 py-3 text-base font-extrabold text-[var(--cream)] shadow-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setPanel('add')}
    >
      <Plus size={18} />
      Add
    </motion.button>
  );
}

export function DrawPanel() {
  const { panel, setPanel, prefs, setPrefs, setTool } = useFieldnote();
  if (panel !== 'draw') return null;
  return (
    <div className="absolute bottom-[max(80px,calc(var(--safe-bottom)+72px))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-[var(--walnut)] p-2 text-[var(--cream)] shadow-xl">
      {(['pen', 'highlighter', 'eraser'] as const).map((tool) => (
        <button
          key={tool}
          type="button"
          className={`min-h-11 rounded-xl px-3 text-xs font-bold capitalize ${
            prefs.draw.tool === tool ? 'bg-[rgba(203,125,70,0.55)]' : ''
          }`}
          onClick={() => setPrefs({ draw: { ...prefs.draw, tool } })}
        >
          {tool}
        </button>
      ))}
      {[2, 3, 6, 10].map((w) => (
        <button
          key={w}
          type="button"
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            prefs.draw.width === w ? 'bg-white/15' : ''
          }`}
          onClick={() => setPrefs({ draw: { ...prefs.draw, width: w } })}
        >
          <span className="block rounded-full bg-[var(--cream)]" style={{ width: w + 4, height: w + 4 }} />
        </button>
      ))}
      <div className="flex max-w-40 gap-1 overflow-x-auto">
        {PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-xl"
            onClick={() => setPrefs({ draw: { ...prefs.draw, color }, lastColor: color })}
            aria-label={`Draw color ${color}`}
          >
            <span
              className="block h-6 w-6 rounded-full"
              style={{
                background: color,
                boxShadow: prefs.draw.color === color ? `0 0 0 2px ${COLORS.cream}` : 'inset 0 0 0 1px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="min-h-11 rounded-xl px-3 text-xs font-bold"
        onClick={() => {
          setTool('select');
          setPanel(null);
        }}
      >
        Done
      </button>
    </div>
  );
}

export function TextFormatPanel() {
  const { panel, setPanel, prefs, applyTextFormat } = useFieldnote();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (panel === 'textFormat') setStep(0);
  }, [panel]);

  if (panel !== 'textFormat') return null;

  const apply = (patch: Partial<{
    fontSize: number;
    fontWeight: 400 | 500 | 600 | 700;
    color: string;
    align: 'left' | 'center' | 'right';
  }>, nextStep: number) => {
    applyTextFormat(patch);
    setStep((current) => Math.max(current, nextStep));
  };

  return (
    <div className="absolute right-3 top-[max(120px,calc(var(--safe-top)+110px))] z-40 w-[min(280px,calc(100vw-24px))] rounded-2xl bg-[var(--walnut)] p-3 text-[var(--cream)] shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-bold tracking-wide text-white/60">TEXT</div>
        <button type="button" aria-label="Close" onClick={() => setPanel(null)}>
          <X size={16} />
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        {[16, 22, 28, 36, 48].map((s) => (
          <button
            key={s}
            type="button"
            className="min-h-11 rounded-xl bg-white/10 px-3 text-sm font-semibold"
            onClick={() => apply({ fontSize: s }, 1)}
          >
            {s}
          </button>
        ))}
      </div>
      {step >= 1 && (
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-xl bg-white/10 font-bold"
          onClick={() => apply({ fontWeight: prefs.textFormat.fontWeight === 700 ? 400 : 700 }, 2)}
        >
          Bold
        </button>
      </div>
      )}
      {step >= 2 && (
      <div className="mb-2 flex gap-2">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-white/10 text-xs font-semibold capitalize"
            onClick={() => apply({ align: a }, 3)}
          >
            {a}
          </button>
        ))}
      </div>
      )}
      {step >= 3 && (
        <div className="grid grid-cols-6 gap-2">
          {PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className="flex h-9 items-center justify-center rounded-xl bg-white/10"
              onClick={() => apply({ color }, 4)}
              aria-label={`Text color ${color}`}
            >
              <span className="block h-6 w-6 rounded-full" style={{ background: color }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
