import {
  CheckSquare,
  FileUp,
  FolderPlus,
  Image as ImageIcon,
  Network,
  Square,
  Type,
} from 'lucide-react';
import { ModalSheet } from '../ModalSheet';
import { useFieldnote } from '../../store/useFieldnote';
import { uid } from '../../lib/seed';
import { COLORS } from '../../lib/theme';
import type { WorkingFile } from '../../types';

function viewCenter() {
  const { camera, viewport } = useFieldnote.getState();
  return {
    x: (viewport.w / 2 - camera.x) / camera.scale,
    y: (viewport.h / 2 - camera.y) / camera.scale,
  };
}

export function AddPanel() {
  const { panel, setPanel, addObject, placeScientificMethod, addWorkingFile } = useFieldnote();
  const open = panel === 'add' || panel === 'onboarding';

  const placeText = () => {
    const c = viewCenter();
    const prefs = useFieldnote.getState().prefs.textFormat;
    addObject({
      id: uid('text'),
      type: 'text',
      x: c.x - 160,
      y: c.y - 70,
      width: 320,
      height: 140,
      zIndex: 10,
      fill: COLORS.paper,
      text: '',
      fontSize: prefs.fontSize,
      fontWeight: prefs.fontWeight,
      color: prefs.color,
      align: prefs.align,
    });
    setPanel('textFormat');
  };

  const placeTask = () => {
    const c = viewCenter();
    addObject({
      id: uid('task'),
      type: 'task',
      x: c.x - 150,
      y: c.y - 50,
      width: 300,
      height: 100,
      zIndex: 10,
      fill: COLORS.paperStrong,
      text: 'New task',
      done: false,
      state: 'ready',
      dependsOn: [],
    });
    setPanel(null);
  };

  const placeRegion = () => {
    const c = viewCenter();
    addObject({
      id: uid('region'),
      type: 'region',
      x: c.x - 180,
      y: c.y - 120,
      width: 360,
      height: 240,
      zIndex: 0,
      fill: 'rgba(233,178,127,0.18)',
      label: 'Region',
      pattern: 'solid',
    });
    setPanel(null);
  };

  const placeMindRoot = () => {
    const c = viewCenter();
    addObject({
      id: uid('mm'),
      type: 'mindmap',
      x: c.x - 90,
      y: c.y - 24,
      width: 180,
      height: 48,
      zIndex: 10,
      fill: COLORS.clay,
      text: 'Idea',
      parentId: null,
      branchColor: COLORS.clay,
    });
    setPanel(null);
  };

  const pickFiles = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,text/markdown,text/plain,audio/*';
    input.onchange = async () => {
      const list = input.files;
      if (!list) return;
      const c = viewCenter();
      let i = 0;
      for (const file of Array.from(list)) {
        const src = URL.createObjectURL(file);
        const wf: WorkingFile = {
          id: uid('file'),
          name: file.name,
          mime: file.type,
          src,
          size: file.size,
          createdAt: Date.now(),
        };
        await addWorkingFile(wf);
        if (file.type.startsWith('image/')) {
          addObject({
            id: uid('image'),
            type: 'image',
            x: c.x - 140 + i * 24,
            y: c.y - 140 + i * 24,
            width: 280,
            height: 280,
            zIndex: 10,
            src,
            alt: file.name,
            fill: COLORS.paper,
          });
        } else if (file.type === 'application/pdf') {
          addObject({
            id: uid('pdf'),
            type: 'pdf',
            x: c.x - 110 + i * 24,
            y: c.y - 140 + i * 24,
            width: 220,
            height: 280,
            zIndex: 10,
            name: file.name,
            src,
            fill: COLORS.walnut,
          });
        } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
          const content = await file.text();
          addObject({
            id: uid('md'),
            type: 'markdown',
            x: c.x - 140 + i * 24,
            y: c.y - 90 + i * 24,
            width: 280,
            height: 180,
            zIndex: 10,
            name: file.name,
            content,
            fill: COLORS.paperStrong,
          });
        } else {
          addObject({
            id: uid('file'),
            type: 'file',
            x: c.x - 120 + i * 24,
            y: c.y - 60 + i * 24,
            width: 240,
            height: 120,
            zIndex: 10,
            name: file.name,
            src,
            mime: file.type,
            size: file.size,
            fill: COLORS.paperStrong,
          });
        }
        i += 1;
      }
      setPanel(null);
    };
    input.click();
  };

  return (
    <ModalSheet
      open={open}
      onClose={() => setPanel(null)}
      title="Add to Fieldnote"
      subtitle="Choose one thing, then return to your board."
      icon={<FileUp size={18} />}
      id="add"
    >
      {panel === 'onboarding' && (
        <div className="mb-4 rounded-2xl bg-[var(--tip)] p-3 text-sm text-[var(--ink)]">
          Hold a card ~500 ms to edit. Pinch to zoom. Drag empty space to pan. Two fingers always navigate.
          <button
            type="button"
            className="mt-2 block text-sm font-bold underline"
            onClick={() => setPanel(null)}
          >
            Dismiss hints
          </button>
        </div>
      )}

      <h3 className="mb-2 text-sm font-bold">From your device</h3>
      <button
        type="button"
        className="mb-2 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-[var(--clay-deep)] px-4 py-3 text-left text-[var(--cream)]"
        onClick={pickFiles}
      >
        <FileUp size={18} />
        <span>
          <div className="font-bold">Choose files</div>
          <div className="text-xs text-white/80">Pick several and place them now.</div>
        </span>
      </button>
      <button
        type="button"
        className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-black/5 bg-[var(--paper-strong)] px-4 py-3 text-left"
        onClick={pickFiles}
      >
        <FolderPlus size={18} />
        <span>
          <div className="font-bold">Choose photos / folder items</div>
          <div className="text-xs text-[var(--muted)]">Images, PDFs, Markdown, audio.</div>
        </span>
      </button>

      <div className="mb-2 flex items-end justify-between">
        <h3 className="text-sm font-bold">Create</h3>
        <span className="text-xs text-[var(--muted)]">Added at view center</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <CreateBtn icon={<Type size={20} />} label="Text" onClick={placeText} />
        <CreateBtn icon={<CheckSquare size={20} />} label="Task" onClick={placeTask} />
        <CreateBtn icon={<Network size={20} />} label="Mind map" onClick={placeMindRoot} />
        <CreateBtn icon={<Square size={20} />} label="Region" onClick={placeRegion} />
        <CreateBtn icon={<ImageIcon size={20} />} label="Scientific method" onClick={() => { placeScientificMethod(); }} />
      </div>
    </ModalSheet>
  );
}

function CreateBtn({
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
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-black/5 bg-[var(--paper-strong)]"
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
