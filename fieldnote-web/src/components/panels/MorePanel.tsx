import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Copy,
  HelpCircle,
  Redo2,
  Shield,
  Trash2,
  Undo2,
  Download,
  Upload,
} from 'lucide-react';
import { ModalSheet } from '../ModalSheet';
import { useFieldnote } from '../../store/useFieldnote';
import { estimateStorage } from '../../lib/persistence';
import { resolveMediaSrc } from '../../lib/blobs';
import { applyInertiaScroll } from '../../lib/inertia';
import { uid } from '../../lib/seed';
import { COLORS } from '../../lib/theme';
import type { WorkingFile } from '../../types';

export function FilesPanel() {
  const { panel, setPanel, files, filesSheet, setFilesSheet, addObject, importPackage, objects } = useFieldnote();
  const [q, setQ] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const el = scrollRef.current;
    if (panel !== 'files' || !el) return;
    return applyInertiaScroll(el);
  }, [panel, filesSheet]);

  const pickPackage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void importPackage(file);
    };
    input.click();
  };

  const placeFile = async (f: WorkingFile) => {
    const { camera, viewport } = useFieldnote.getState();
    const x = (viewport.w / 2 - camera.x) / camera.scale - 120;
    const y = (viewport.h / 2 - camera.y) / camera.scale - 60;
    const zIndex = objects.reduce((max, obj) => Math.max(max, obj.zIndex), 0) + 1;

    if (f.mime?.startsWith('image/')) {
      addObject({
        id: uid('image'),
        type: 'image',
        x,
        y,
        width: 260,
        height: 260,
        zIndex,
        src: f.src,
        alt: f.name,
        fill: COLORS.paper,
      });
    } else if (f.mime === 'application/pdf') {
      addObject({
        id: uid('pdf'),
        type: 'pdf',
        x,
        y,
        width: 220,
        height: 280,
        zIndex,
        name: f.name,
        src: f.src,
        coverDataUrl: f.coverDataUrl,
        fill: COLORS.walnut,
      });
    } else if (f.mime?.startsWith('audio/')) {
      addObject({
        id: uid('audio'),
        type: 'audio',
        x,
        y,
        width: 260,
        height: 96,
        zIndex,
        name: f.name,
        src: f.src,
        mime: f.mime,
        blobId: f.blobId,
        fill: COLORS.paperStrong,
      });
    } else if (isMarkdownFile(f)) {
      const src = await resolveMediaSrc(f.src);
      const content = await fetch(src).then((res) => res.text()).catch(() => '');
      addObject({
        id: uid('md'),
        type: 'markdown',
        x,
        y,
        width: 280,
        height: 180,
        zIndex,
        name: f.name,
        content,
        fill: COLORS.paperStrong,
      });
    } else {
      addObject({
        id: uid('file'),
        type: 'file',
        x,
        y,
        width: 240,
        height: 120,
        zIndex,
        name: f.name,
        src: f.src,
        mime: f.mime,
        size: f.size,
        fill: COLORS.paperStrong,
      });
    }

    setPanel(null);
  };

  return (
    <ModalSheet
      open={panel === 'files'}
      onClose={() => setPanel(null)}
      title="Working files"
      subtitle="Files stay on this device until you place them."
      id="files"
      size={filesSheet}
    >
      <div className="mb-3 flex gap-2">
        {(['peek', 'half', 'full'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-bold capitalize ${
              filesSheet === mode ? 'bg-[var(--walnut)] text-[var(--cream)]' : 'bg-[var(--paper-strong)]'
            }`}
            onClick={() => setFilesSheet(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--clay-deep)] px-4 py-2 font-bold text-[var(--cream)]"
        onClick={pickPackage}
      >
        <Upload size={16} />
        Import package
      </button>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search working files"
        className="mb-3 w-full rounded-xl border border-black/5 bg-[var(--paper-strong)] px-3 py-3 outline-none"
      />
      <div ref={scrollRef} className="min-h-0 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-[var(--paper-strong)] p-4 text-sm text-[var(--muted)]">
            {files.length} files on this device. Import from Add to keep them with this board.
          </p>
        ) : (
          filtered.slice(0, filesSheet === 'peek' ? 4 : filesSheet === 'half' ? 12 : filtered.length).map((f) => (
            <button
              key={f.id}
              type="button"
              className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-[var(--paper-strong)] p-3 text-left"
              onClick={() => {
                void placeFile(f);
              }}
            >
              <span className="text-xl">{fileIcon(f)}</span>
              <span className="min-w-0 flex-1">
                <div className="truncate font-semibold">{f.name}</div>
                <div className="text-xs text-[var(--muted)]">{f.mime ?? 'file'}</div>
              </span>
            </button>
          ))
        )}
      </div>
    </ModalSheet>
  );
}

function isMarkdownFile(file: WorkingFile) {
  const name = file.name.toLowerCase();
  return file.mime === 'text/markdown' || name.endsWith('.md') || name.endsWith('.markdown');
}

function fileIcon(file: WorkingFile) {
  if (file.mime?.startsWith('image/')) return 'IMG';
  if (file.mime === 'application/pdf') return 'PDF';
  if (file.mime?.startsWith('audio/')) return 'AUD';
  if (isMarkdownFile(file)) return 'MD';
  return 'DOC';
}

export function FindPanel() {
  const { panel, setPanel, objects, select, setCamera, camera, viewport } = useFieldnote();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'everything' | 'text' | 'image' | 'task' | 'file'>('everything');

  const results = useMemo(() => {
    return objects.filter((o) => {
      if (o.type === 'connector' || o.type === 'drawing') return false;
      if (type !== 'everything') {
        if (type === 'file' && !(o.type === 'file' || o.type === 'pdf' || o.type === 'markdown'))
          return false;
        else if (type !== 'file' && o.type !== type) return false;
      }
      if (!q.trim()) return true;
      const hay =
        'text' in o
          ? String((o as { text?: string }).text)
          : 'name' in o
            ? String((o as { name?: string }).name)
            : 'label' in o
              ? String((o as { label?: string }).label)
              : o.type;
      return hay.toLowerCase().includes(q.toLowerCase());
    });
  }, [objects, q, type]);

  return (
    <ModalSheet open={panel === 'find'} onClose={() => setPanel(null)} title="Find anything" id="find">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cards, files…"
        className="mb-3 w-full rounded-xl border border-black/5 bg-[var(--paper-strong)] px-3 py-3 outline-none"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {(['everything', 'text', 'image', 'task', 'file'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              type === t ? 'bg-[var(--walnut)] text-[var(--cream)]' : 'bg-[var(--paper-strong)]'
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="mb-2 text-xs text-[var(--muted)]">{results.length} results</div>
      {results.map((o) => {
        const label =
          'text' in o
            ? String((o as { text: string }).text).slice(0, 80) || 'Untitled'
            : 'name' in o
              ? String((o as { name: string }).name)
              : o.type;
        return (
          <button
            key={o.id}
            type="button"
            className="mb-2 w-full rounded-2xl bg-[var(--paper-strong)] p-3 text-left"
            onClick={() => {
              select([o.id]);
              const scale = camera.scale;
              setCamera({
                x: viewport.w / 2 - (o.x + o.width / 2) * scale,
                y: viewport.h / 2 - (o.y + o.height / 2) * scale,
              });
              setPanel(null);
            }}
          >
            <div className="font-semibold">{label}</div>
            <div className="text-xs text-[var(--muted)]">{o.type}</div>
          </button>
        );
      })}
    </ModalSheet>
  );
}

export function MorePanel() {
  const {
    panel,
    setPanel,
    undo,
    redo,
    history,
    future,
    boards,
    createBoard,
    switchBoard,
    removeBoard,
    fitBoard,
    viewport,
    currentId,
    exportPackage,
    importPackage,
    backgroundEdit,
    setBackgroundEdit,
    copySelection,
    pasteClipboard,
    selectedIds,
    clipboard,
  } = useFieldnote();

  const pickPackage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void importPackage(file);
    };
    input.click();
  };

  return (
    <>
      <ModalSheet open={panel === 'more'} onClose={() => setPanel(null)} title="Board controls" id="more">
        <Row
          icon={<Undo2 size={18} />}
          title="Undo"
          disabled={!history.length}
          onClick={() => {
            undo();
            setPanel(null);
          }}
        />
        <Row
          icon={<Redo2 size={18} />}
          title="Redo"
          disabled={!future.length}
          onClick={() => {
            redo();
            setPanel(null);
          }}
        />
        <Row
          icon={<HelpCircle size={18} />}
          title="Gestures & shortcuts"
          onClick={() => setPanel('gestures')}
        />
        <Row icon={<Shield size={18} />} title="Storage & safety" onClick={() => setPanel('storage')} />
        <Row
          icon={<Download size={18} />}
          title="Export package"
          onClick={() => {
            void exportPackage();
            setPanel(null);
          }}
        />
        <Row
          icon={<Upload size={18} />}
          title="Import package"
          onClick={pickPackage}
        />
        <Row
          icon={<Shield size={18} />}
          title={backgroundEdit ? 'Background edit on' : 'Background edit off'}
          onClick={() => setBackgroundEdit(!backgroundEdit)}
        />
        <Row
          icon={<Copy size={18} />}
          title="Copy selection"
          disabled={!selectedIds.length}
          onClick={() => {
            copySelection();
            setPanel(null);
          }}
        />
        <Row
          icon={<Clipboard size={18} />}
          title="Paste selection"
          disabled={!clipboard?.objects.length}
          onClick={() => {
            pasteClipboard();
            setPanel(null);
          }}
        />
        <div className="mt-4 text-sm font-bold">Boards</div>
        <button
          type="button"
          className="mt-2 min-h-11 rounded-2xl bg-[var(--clay-deep)] px-4 py-2 font-bold text-[var(--cream)]"
          onClick={() => {
            createBoard();
            setPanel(null);
          }}
        >
          New board
        </button>
        {boards.map((b) => (
          <div
            key={b.id}
            className="mt-2 flex items-center gap-2 rounded-2xl bg-[var(--paper-strong)] p-3"
          >
            <button
              type="button"
              className="flex-1 text-left font-semibold"
              onClick={() => {
                void switchBoard(b.id);
                setPanel(null);
              }}
            >
              {b.name}
              {b.id === currentId ? ' ✓' : ''}
            </button>
            {boards.length > 1 && (
              <button type="button" aria-label="Delete board" onClick={() => void removeBoard(b.id)}>
                <Trash2 size={16} className="text-[var(--muted)]" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-2xl border border-black/10 px-4 py-2 font-semibold"
          onClick={() => {
            fitBoard(viewport.w, viewport.h);
            setPanel(null);
          }}
        >
          Fit board
        </button>
      </ModalSheet>

      <ModalSheet
        open={panel === 'gestures'}
        onClose={() => setPanel(null)}
        eyebrow="QUICK REFERENCE"
        title="Move through Fieldnote"
        id="gestures"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Tip title="Tap a card" body="Select without opening the keyboard" />
          <Tip title="Hold ~500 ms" body="Edit text with haptic confirm" />
          <Tip title="Drag empty space" body="Pan the canvas" />
          <Tip title="Pinch" body="Zoom in or out" />
          <Tip title="Two fingers anywhere" body="Always navigate — even over cards" />
          <Tip title="Multi + drag empty" body="Marquee select" />
          <Tip title="Connector dots" body="Link cards; second finger can pan/zoom" />
          <Tip title="Fit board" body="From More or the zoom bar" />
        </div>
        <div className="mt-4 rounded-2xl bg-[var(--tip)] p-3 text-sm font-semibold">
          Tip: Two fingers always pan and zoom while drawing or connecting.
        </div>
      </ModalSheet>

      <StoragePanel />
    </>
  );
}

function StoragePanel() {
  const { panel, setPanel, boards, objects, files } = useFieldnote();
  const [stats, setStats] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    if (panel === 'storage') void estimateStorage().then(setStats);
  }, [panel]);

  return (
    <ModalSheet
      open={panel === 'storage'}
      onClose={() => setPanel(null)}
      title="Storage & safety"
      id="storage"
    >
      <div className="rounded-2xl bg-[var(--paper-strong)] p-4">
        <div className="text-lg font-extrabold">{boards.length} boards</div>
        <div className="text-sm text-[var(--muted)]">
          {objects.length} objects · {files.length} working files · device-local IndexedDB
        </div>
        {stats && (
          <div className="mt-2 text-xs text-[var(--muted)]">
            ~{Math.round((stats.usage / 1e6) * 10) / 10} MB used
            {stats.quota ? ` of ${Math.round(stats.quota / 1e6)} MB` : ''}
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Waiting before editing protects your saved work. Boards autosave as you move and write. Clearing
        site data removes local boards.
      </p>
    </ModalSheet>
  );
}

function Row({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mb-2 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-[var(--paper-strong)] px-3 py-3 text-left disabled:opacity-40"
    >
      {icon}
      <span className="font-bold">{title}</span>
    </button>
  );
}

function Tip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-[var(--paper-strong)] p-3">
      <div className="text-sm font-bold">{title}</div>
      <div className="text-xs text-[var(--muted)]">{body}</div>
    </div>
  );
}
