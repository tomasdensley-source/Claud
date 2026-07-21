import { create } from 'zustand';
import type {
  AudioObject,
  BoardObject,
  BoardSnapshot,
  Camera,
  ClipboardPayload,
  ConnectorObject,
  Panel,
  RegionObject,
  Side,
  TextFormatPrefs,
  TaskObject,
  Tool,
  UiPrefs,
  WorkingFile,
} from '../types';
import {
  deleteBoard,
  loadBoards,
  loadFiles,
  loadPrefs,
  saveBoard,
  saveFile,
  savePrefs,
  setCurrentBoardId,
  exportPackageWithBlobs,
  importSnapshotPackage,
} from '../lib/persistence';
import { createMainBoard, scientificMethodMindMap, uid } from '../lib/seed';
import { COLORS } from '../lib/theme';
import { haptic } from '../lib/haptics';
import {
  addMindChild as addMindChildObjects,
  addMindSibling as addMindSiblingObjects,
  getMindSubtreeIds,
  moveMindSubtree,
  simplifyMindDepth as simplifyMindDepthObjects,
  tidyMindMap as tidyMindMapObjects,
  toggleCollapse,
} from '../lib/mindmap';
import { isPdfTooLarge, generatePdfCover, MAX_PDF_BYTES } from '../lib/pdf';
import { storeFileAsBlob, toBlobRef } from '../lib/blobs';
import {
  acquireWriteLock,
  releaseWriteLock,
  startWriteLockHeartbeat,
  warnUnsavedBeforeUnload,
} from '../lib/tabLock';

interface HistoryEntry {
  objects: BoardObject[];
  camera: Camera;
}

interface FieldnoteState {
  ready: boolean;
  boards: BoardSnapshot[];
  currentId: string;
  objects: BoardObject[];
  camera: Camera;
  selectedIds: string[];
  editingId: string | null;
  tool: Tool;
  panel: Panel;
  prefs: UiPrefs;
  files: WorkingFile[];
  history: HistoryEntry[];
  future: HistoryEntry[];
  connecting: null | { fromId: string; fromSide: Side };
  drawingId: string | null;
  toast: null | { message: string; undo?: boolean };
  pdfReader: null | { id: string };
  viewport: { w: number; h: number };
  readOnly: boolean;
  dirty: boolean;
  filesSheet: 'peek' | 'half' | 'full';
  backgroundEdit: boolean;
  clipboard: ClipboardPayload | null;
  markdownEditorId: string | null;
  audioPlayerId: string | null;

  bootstrap: () => Promise<void>;
  setDirty: (dirty: boolean) => void;
  setViewport: (w: number, h: number) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setTool: (tool: Tool) => void;
  setPanel: (panel: Panel) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  setEditing: (id: string | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateObjects: (fn: (objs: BoardObject[]) => BoardObject[], record?: boolean) => void;
  addObject: (obj: BoardObject, record?: boolean) => void;
  addMany: (objs: BoardObject[]) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  moveSelected: (dx: number, dy: number, commit?: boolean) => void;
  resizeObject: (id: string, width: number, height: number) => void;
  setObjectColor: (color: string) => void;
  updateText: (id: string, text: string) => void;
  toggleTask: (id: string) => void;
  beginConnect: (fromId: string, side: Side) => void;
  completeConnect: (toId: string, side: Side) => void;
  cancelConnect: () => void;
  fitBoard: (vw: number, vh: number) => void;
  fitSelection: (vw: number, vh: number) => void;
  createBoard: () => void;
  switchBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => void;
  removeBoard: (id: string) => void;
  persist: () => Promise<void>;
  setPrefs: (patch: Partial<UiPrefs>) => void;
  addWorkingFile: (file: WorkingFile) => Promise<void>;
  importPackage: (file: File) => Promise<void>;
  exportPackage: () => Promise<void>;
  importDeviceFiles: (files: FileList | File[]) => Promise<void>;
  placeScientificMethod: () => void;
  toggleMindCollapse: (id: string) => void;
  addMindChild: (id: string) => void;
  addMindSibling: (id: string) => void;
  tidyMindMap: (id: string) => void;
  simplifyMindDepth: (id: string, depth: number) => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  setRegionProps: (id: string, patch: Partial<Pick<RegionObject, 'pattern' | 'opacity' | 'locked'>>) => void;
  setBackgroundEdit: (backgroundEdit: boolean) => void;
  setFilesSheet: (mode: 'peek' | 'half' | 'full') => void;
  openMarkdown: (id: string) => void;
  saveMarkdown: (id: string, content: string) => void;
  closeMarkdown: () => void;
  openAudio: (id: string) => void;
  closeAudio: () => void;
  applyTextFormat: (patch: Partial<TextFormatPrefs>) => void;
  setToast: (toast: FieldnoteState['toast']) => void;
  setPdfReader: (id: string | null) => void;
  setDrawingId: (id: string | null) => void;
  appendDrawPoints: (points: number[], start: boolean) => void;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function recomputeTaskStates(objects: BoardObject[]): BoardObject[] {
  const tasks = objects.filter((o): o is TaskObject => o.type === 'task');
  const byId = new Map(tasks.map((t) => [t.id, t]));

  const isDone = (id: string) => byId.get(id)?.done === true;

  return objects.map((o) => {
    if (o.type !== 'task') return o;
    if (o.done) return { ...o, state: 'done' as const };
    const deps = o.dependsOn ?? [];
    if (deps.length === 0) return { ...o, state: 'ready' as const };
    const ready = deps.every(isDone);
    return { ...o, state: ready ? 'ready' : 'blocked' };
  });
}

function wouldCreateCycle(objects: BoardObject[], fromId: string, toId: string): boolean {
  // from completes → enables to; edge from→to. Cycle if to can reach from.
  const tasks = objects.filter((o): o is TaskObject => o.type === 'task');
  const deps = new Map(tasks.map((t) => [t.id, t.dependsOn ?? []]));
  const stack = [...(deps.get(fromId) ?? [])];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === toId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(deps.get(id) ?? []));
  }
  // Also if to already depends on from indirectly via connecting from as upstream of to
  // Connecting fromId → toId means to depends on from
  const stack2 = [toId];
  const seen2 = new Set<string>();
  while (stack2.length) {
    const id = stack2.pop()!;
    if (id === fromId) return true;
    if (seen2.has(id)) continue;
    seen2.add(id);
    for (const t of tasks) {
      if ((t.dependsOn ?? []).includes(id)) stack2.push(t.id);
    }
  }
  return false;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistVersion = 0;
let heartbeatCleanup: (() => void) | null = null;
let releaseRegistered = false;

function maxZIndex(objects: BoardObject[]): number {
  return objects.reduce((max, obj) => Math.max(max, obj.zIndex), 0);
}

function viewCenter(camera: Camera, viewport: { w: number; h: number }, offset = { x: 0, y: 0 }) {
  return {
    x: (viewport.w / 2 - camera.x) / camera.scale + offset.x,
    y: (viewport.h / 2 - camera.y) / camera.scale + offset.y,
  };
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function pastedIdFor(obj: BoardObject) {
  return uid(obj.type === 'connector' ? 'conn' : obj.type);
}

function makeImportedBoardList(boards: BoardSnapshot[], imported: BoardSnapshot): BoardSnapshot[] {
  const withoutImported = boards.filter((board) => board.id !== imported.id);
  return [...withoutImported, imported];
}

const initialPrefs = loadPrefs();

export const useFieldnote = create<FieldnoteState>((set, get) => ({
  ready: false,
  boards: [],
  currentId: 'main',
  objects: [],
  camera: { x: 0, y: 0, scale: 1 },
  selectedIds: [],
  editingId: null,
  tool: 'select',
  panel: 'onboarding',
  prefs: initialPrefs,
  files: [],
  history: [],
  future: [],
  connecting: null,
  drawingId: null,
  toast: null,
  pdfReader: null,
  viewport: { w: 390, h: 844 },
  readOnly: false,
  dirty: false,
  filesSheet: initialPrefs.filesSheet,
  backgroundEdit: initialPrefs.backgroundEdit,
  clipboard: null,
  markdownEditorId: null,
  audioPlayerId: null,

  bootstrap: async () => {
    const lock = acquireWriteLock();
    if (!lock.ok) {
      set({ readOnly: true, toast: { message: 'Another tab is editing. This tab is read-only.' } });
    } else if (!heartbeatCleanup) {
      heartbeatCleanup = startWriteLockHeartbeat(() => {
        set({ readOnly: true, toast: { message: 'Write lock lost. This tab is read-only.' } });
        warnUnsavedBeforeUnload(get().dirty);
      });

      if (!releaseRegistered && typeof window !== 'undefined') {
        releaseRegistered = true;
        window.addEventListener('pagehide', releaseWriteLock);
      }
    }

    const { boards, currentId } = await loadBoards();
    const current = boards.find((b) => b.id === currentId) ?? boards[0] ?? createMainBoard();
    const files = await loadFiles();
    const prefs = loadPrefs();
    set({
      ready: true,
      boards,
      currentId: current.id,
      objects: recomputeTaskStates(current.objects),
      camera: current.camera,
      files,
      prefs,
      filesSheet: prefs.filesSheet,
      backgroundEdit: prefs.backgroundEdit,
      panel: current.objects.length === 0 ? 'onboarding' : null,
    });
  },

  setDirty: (dirty) => {
    set({ dirty });
    warnUnsavedBeforeUnload(dirty);
  },

  setViewport: (w, h) => set({ viewport: { w, h } }),

  setCamera: (camera) => set((s) => ({ camera: { ...s.camera, ...camera } })),

  setTool: (tool) => set({ tool, panel: tool === 'draw' ? 'draw' : get().panel === 'draw' ? null : get().panel }),

  setPanel: (panel) => set({ panel }),

  select: (ids, additive = false) =>
    set((s) => {
      if (!additive) return { selectedIds: ids, editingId: null };
      const next = new Set(s.selectedIds);
      ids.forEach((id) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      return { selectedIds: [...next], editingId: null };
    }),

  clearSelection: () => set({ selectedIds: [], editingId: null }),

  setEditing: (id) => {
    if (id) haptic('edit');
    set({ editingId: id, selectedIds: id ? [id] : get().selectedIds });
  },

  pushHistory: () => {
    const { objects, camera, history } = get();
    set({
      history: [...history.slice(-50), { objects: clone(objects), camera: { ...camera } }],
      future: [],
    });
  },

  undo: () => {
    const { history, objects, camera, future } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      future: [{ objects: clone(objects), camera: { ...camera } }, ...future].slice(0, 50),
      objects: prev.objects,
      camera: prev.camera,
    });
    void get().persist();
  },

  redo: () => {
    const { future, objects, camera, history } = get();
    if (!future.length) return;
    const [next, ...rest] = future;
    set({
      future: rest,
      history: [...history, { objects: clone(objects), camera: { ...camera } }],
      objects: next.objects,
      camera: next.camera,
    });
    void get().persist();
  },

  updateObjects: (fn, record = true) => {
    if (record) get().pushHistory();
    set((s) => ({ objects: recomputeTaskStates(fn(s.objects)) }));
    void get().persist();
  },

  addObject: (obj, record = true) => {
    get().updateObjects((objs) => [...objs, obj], record);
    set({ selectedIds: [obj.id] });
  },

  addMany: (objs) => {
    get().updateObjects((o) => [...o, ...objs]);
    set({ selectedIds: objs.filter((x) => x.type !== 'connector').map((x) => x.id) });
  },

  deleteSelected: () => {
    const ids = new Set(get().selectedIds);
    if (!ids.size) return;
    get().updateObjects((objs) =>
      objs.filter((o) => {
        if (ids.has(o.id)) return false;
        if (o.type === 'connector' && (ids.has(o.fromId) || ids.has(o.toId))) return false;
        return true;
      }),
    );
    set({ selectedIds: [], editingId: null, toast: { message: 'Deleted', undo: true } });
  },

  duplicateSelected: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().pushHistory();
    const copies: BoardObject[] = [];
    const map = new Map<string, string>();
    get().objects.forEach((o) => {
      if (!ids.includes(o.id) || o.type === 'connector') return;
      const id = uid(o.type);
      map.set(o.id, id);
      copies.push({ ...clone(o), id, x: o.x + 28, y: o.y + 28 });
    });
    get().objects.forEach((o) => {
      if (o.type !== 'connector') return;
      if (!map.has(o.fromId) || !map.has(o.toId)) return;
      copies.push({
        ...clone(o),
        id: uid('conn'),
        fromId: map.get(o.fromId)!,
        toId: map.get(o.toId)!,
      });
    });
    set((s) => ({
      objects: recomputeTaskStates([...s.objects, ...copies]),
      selectedIds: copies.filter((c) => c.type !== 'connector').map((c) => c.id),
    }));
    void get().persist();
  },

  moveSelected: (dx, dy, commit = false) => {
    const ids = new Set(get().selectedIds);
    if (!ids.size) return;
    if (commit) get().pushHistory();
    set((s) => ({
      objects: (() => {
        const selectedMindIds = s.objects
          .filter((obj) => obj.type === 'mindmap' && ids.has(obj.id))
          .map((obj) => obj.id);
        const nestedMindIds = new Set<string>();

        selectedMindIds.forEach((id) => {
          getMindSubtreeIds(s.objects, id).forEach((subId) => {
            if (subId !== id && ids.has(subId)) nestedMindIds.add(subId);
          });
        });

        const rootMindIds = selectedMindIds.filter((id) => !nestedMindIds.has(id));
        const movedByMind = new Set<string>();
        let next = s.objects;

        rootMindIds.forEach((id) => {
          getMindSubtreeIds(next, id).forEach((subId) => movedByMind.add(subId));
          next = moveMindSubtree(next, id, dx, dy);
        });

        return next.map((o) =>
          ids.has(o.id) && !movedByMind.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o,
        );
      })(),
    }));
    if (commit) {
      haptic('drop');
      void get().persist();
    }
  },

  resizeObject: (id, width, height) => {
    get().updateObjects((objs) =>
      objs.map((o) =>
        o.id === id ? { ...o, width: Math.max(80, width), height: Math.max(48, height) } : o,
      ),
    );
  },

  setObjectColor: (color) => {
    const { tool, panel, prefs } = get();
    if (tool === 'draw' || panel === 'draw') {
      get().setPrefs({ draw: { ...prefs.draw, color }, lastColor: color, paletteOpen: true });
    }

    const ids = new Set(get().selectedIds);
    if (!ids.size) return;
    get().updateObjects((objs) =>
      objs.map((o) => {
        if (!ids.has(o.id)) return o;
        if (o.type === 'text') return { ...o, fill: color };
        if (o.type === 'task') return { ...o, fill: color };
        if (o.type === 'region') return { ...o, fill: color };
        if (o.type === 'mindmap') return { ...o, fill: color, branchColor: color };
        if (o.type === 'shape') return { ...o, fill: color };
        if (o.type === 'connector') return { ...o, stroke: color };
        return { ...o, fill: color };
      }),
    );
    get().setPrefs({ lastColor: color, paletteOpen: true });
  },

  updateText: (id, text) => {
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o;
        if (o.type === 'text' || o.type === 'task' || o.type === 'mindmap') return { ...o, text };
        return o;
      }),
    }));
    void get().persist();
  },

  toggleTask: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj || obj.type !== 'task') return;
    if (!obj.done && obj.state === 'blocked') {
      set({ toast: { message: 'Blocked — complete an upstream task first' } });
      return;
    }
    get().updateObjects((objs) => {
      const next = objs.map((o) => {
            if (o.id !== id || o.type !== 'task') return o;
            const done = !o.done;
            const state = done ? ('done' as const) : ('ready' as const);
            return { ...o, done, state };
      });
      // Downstream reset when unchecking
      if (obj.done) {
        return next.map((o) => {
          if (o.type !== 'task') return o;
          if ((o.dependsOn ?? []).includes(id) && o.done) {
            return { ...o, done: false };
          }
          return o;
        });
      }
      return next;
    });
    haptic('confirm');
  },

  beginConnect: (fromId, side) => set({ connecting: { fromId, fromSide: side } }),

  completeConnect: (toId, side) => {
    const { connecting, objects } = get();
    if (!connecting || connecting.fromId === toId) {
      set({ connecting: null });
      return;
    }
    const from = objects.find((o) => o.id === connecting.fromId);
    const to = objects.find((o) => o.id === toId);
    if (!from || !to) {
      set({ connecting: null });
      return;
    }

    // Dependency connectors: task → task
    if (from.type === 'task' && to.type === 'task') {
      if (wouldCreateCycle(objects, connecting.fromId, toId)) {
        set({ connecting: null, toast: { message: 'That would create a dependency cycle' } });
        return;
      }
      get().updateObjects((objs) => {
        const conn: ConnectorObject = {
          id: uid('conn'),
          type: 'connector',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          zIndex: 3,
          fromId: connecting.fromId,
          toId,
          fromSide: connecting.fromSide,
          toSide: side,
          kind: 'dependency',
          curved: false,
          stroke: COLORS.connector,
        };
        return objs.map((o) => {
          if (o.id === toId && o.type === 'task') {
            const dependsOn = Array.from(new Set([...(o.dependsOn ?? []), connecting.fromId]));
            return { ...o, dependsOn };
          }
          return o;
        }).concat(conn);
      });
      haptic('connect');
      set({ connecting: null });
      return;
    }

    get().updateObjects((objs) => [
      ...objs,
      {
        id: uid('conn'),
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zIndex: 3,
        fromId: connecting.fromId,
        toId,
        fromSide: connecting.fromSide,
        toSide: side,
        kind: from.type === 'mindmap' || to.type === 'mindmap' ? 'mindmap' : 'default',
        curved: from.type === 'mindmap' || to.type === 'mindmap',
        stroke: COLORS.connector,
      } satisfies ConnectorObject,
    ]);
    haptic('connect');
    set({ connecting: null });
  },

  cancelConnect: () => set({ connecting: null }),

  fitBoard: (vw, vh) => {
    const items = get().objects.filter((o) => o.type !== 'connector');
    if (!items.length) {
      set({ camera: { x: 0, y: 0, scale: 1 } });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    items.forEach((o) => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });
    const pad = 80;
    const w = Math.max(200, maxX - minX + pad * 2);
    const h = Math.max(200, maxY - minY + pad * 2);
    const scale = Math.min(vw / w, vh / h, 1.25);
    set({
      camera: {
        scale,
        x: vw / 2 - ((minX + maxX) / 2) * scale,
        y: vh / 2 - ((minY + maxY) / 2) * scale,
      },
    });
  },

  fitSelection: (vw, vh) => {
    const ids = new Set(get().selectedIds);
    const items = get().objects.filter((o) => ids.has(o.id));
    if (!items.length) return get().fitBoard(vw, vh);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    items.forEach((o) => {
      minX = Math.min(minX, o.x);
      minY = Math.min(minY, o.y);
      maxX = Math.max(maxX, o.x + o.width);
      maxY = Math.max(maxY, o.y + o.height);
    });
    const pad = 64;
    const w = Math.max(120, maxX - minX + pad * 2);
    const h = Math.max(120, maxY - minY + pad * 2);
    const scale = Math.min(vw / w, vh / h, 1.6);
    set({
      camera: {
        scale,
        x: vw / 2 - ((minX + maxX) / 2) * scale,
        y: vh / 2 - ((minY + maxY) / 2) * scale,
      },
    });
  },

  createBoard: () => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: boards cannot be created here.' } });
      return;
    }

    const board: BoardSnapshot = {
      id: uid('board'),
      name: `Board ${get().boards.length + 1}`,
      updatedAt: Date.now(),
      camera: { x: 0, y: 0, scale: 1 },
      objects: [],
    };
    set((s) => ({
      boards: [...s.boards, board],
      currentId: board.id,
      objects: [],
      camera: board.camera,
      selectedIds: [],
      panel: 'onboarding',
    }));
    void saveBoard(board);
    void setCurrentBoardId(board.id);
  },

  switchBoard: async (id) => {
    await get().persist();
    const board = get().boards.find((b) => b.id === id);
    if (!board) return;
    set({
      currentId: id,
      objects: recomputeTaskStates(board.objects),
      camera: board.camera,
      selectedIds: [],
      panel: null,
    });
    await setCurrentBoardId(id);
  },

  renameBoard: (id, name) => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: boards cannot be renamed here.' } });
      return;
    }

    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b)),
    }));
    const b = get().boards.find((x) => x.id === id);
    if (b) void saveBoard(b);
  },

  removeBoard: async (id) => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: boards cannot be deleted here.' } });
      return;
    }

    if (get().boards.length <= 1) return;
    await deleteBoard(id);
    const boards = get().boards.filter((b) => b.id !== id);
    const next = boards[0];
    set({
      boards,
      currentId: next.id,
      objects: recomputeTaskStates(next.objects),
      camera: next.camera,
      selectedIds: [],
    });
    await setCurrentBoardId(next.id);
  },

  persist: async () => {
    if (persistTimer) clearTimeout(persistTimer);
    get().setDirty(true);
    const version = ++persistVersion;

    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: changes are not saved here.' } });
      return;
    }

    persistTimer = setTimeout(async () => {
      const { currentId, objects, camera, boards } = get();
      const board: BoardSnapshot = {
        id: currentId,
        name: boards.find((b) => b.id === currentId)?.name ?? 'Board',
        updatedAt: Date.now(),
        objects: clone(objects),
        camera: { ...camera },
      };
      await saveBoard(board);
      set((s) => ({
        boards: s.boards.map((b) => (b.id === board.id ? board : b)),
      }));
      if (version === persistVersion) get().setDirty(false);
    }, 280);
  },

  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    set({
      prefs,
      filesSheet: prefs.filesSheet,
      backgroundEdit: prefs.backgroundEdit,
    });
    savePrefs(prefs);
  },

  addWorkingFile: async (file) => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: files cannot be imported here.' } });
      return;
    }

    await saveFile(file);
    set((s) => ({ files: [...s.files.filter((f) => f.id !== file.id), file] }));
  },

  importPackage: async (file) => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: packages cannot be imported here.' } });
      return;
    }

    const text = await file.text();
    const pkg = JSON.parse(text);
    const { board, files } = await importSnapshotPackage(pkg);

    set((s) => ({
      boards: makeImportedBoardList(s.boards, board),
      currentId: board.id,
      objects: recomputeTaskStates(board.objects),
      camera: board.camera,
      files: [...s.files.filter((existing) => !files.some((file) => file.id === existing.id)), ...files],
      selectedIds: [],
      panel: board.objects.length === 0 ? 'onboarding' : null,
      toast: { message: 'Package imported' },
    }));
    get().setDirty(false);
  },

  exportPackage: async () => {
    await get().persist();
    const { currentId, boards, objects, camera, files } = get();
    const baseBoard = boards.find((b) => b.id === currentId) ?? createMainBoard();
    const board: BoardSnapshot = {
      ...baseBoard,
      camera,
      objects: clone(objects),
      updatedAt: Date.now(),
    };
    const pkg = await exportPackageWithBlobs(board, files);
    downloadJson(`${board.name.replace(/\s+/g, '-').toLowerCase()}-fieldnote.json`, pkg);
    set({ toast: { message: 'Package downloaded' } });
  },

  importDeviceFiles: async (filesInput) => {
    if (get().readOnly) {
      set({ toast: { message: 'Read-only tab: files cannot be imported here.' } });
      return;
    }

    const files = Array.from(filesInput);
    if (!files.length) return;

    const { camera, viewport, objects } = get();
    const start = viewCenter(camera, viewport);
    const imported: BoardObject[] = [];
    let zIndex = maxZIndex(objects) + 1;
    let index = 0;

    for (const file of files) {
      if (file.type === 'application/pdf' && isPdfTooLarge(file.size)) {
        const mb = Math.round(MAX_PDF_BYTES / 1024 / 1024);
        set({ toast: { message: `${file.name} is larger than the ${mb} MB PDF limit` } });
        continue;
      }

      const stored = await storeFileAsBlob(file);
      const src = toBlobRef(stored.id);
      const fileRecord: WorkingFile = {
        id: uid('file'),
        name: file.name,
        mime: stored.mime,
        src,
        blobId: stored.id,
        size: stored.size,
        createdAt: Date.now(),
      };
      await get().addWorkingFile(fileRecord);

      const x = start.x - 140 + index * 24;
      const y = start.y - 120 + index * 24;

      if (stored.mime.startsWith('image/')) {
        imported.push({
          id: uid('image'),
          type: 'image',
          x,
          y,
          width: 280,
          height: 280,
          zIndex: zIndex++,
          src,
          alt: file.name,
          fill: COLORS.paper,
        });
      } else if (stored.mime === 'application/pdf') {
        const cover = await generatePdfCover(file, { jobId: stored.id });
        fileRecord.coverDataUrl = cover?.coverDataUrl;
        await get().addWorkingFile(fileRecord);
        imported.push({
          id: uid('pdf'),
          type: 'pdf',
          x,
          y,
          width: 220,
          height: 280,
          zIndex: zIndex++,
          name: file.name,
          src,
          coverDataUrl: cover?.coverDataUrl,
          pageCount: cover?.pageCount,
          fill: COLORS.walnut,
        });
      } else if (stored.mime.startsWith('audio/')) {
        imported.push({
          id: uid('audio'),
          type: 'audio',
          x,
          y,
          width: 260,
          height: 96,
          zIndex: zIndex++,
          name: file.name,
          src,
          mime: stored.mime,
          blobId: stored.id,
          fill: COLORS.paperStrong,
        } satisfies AudioObject);
      } else if (stored.mime.startsWith('text/') || file.name.toLowerCase().endsWith('.md')) {
        imported.push({
          id: uid('md'),
          type: 'markdown',
          x,
          y,
          width: 280,
          height: 180,
          zIndex: zIndex++,
          name: file.name,
          content: await file.text(),
          fill: COLORS.paperStrong,
        });
      } else {
        imported.push({
          id: uid('file'),
          type: 'file',
          x,
          y,
          width: 240,
          height: 120,
          zIndex: zIndex++,
          name: file.name,
          src,
          mime: stored.mime,
          size: stored.size,
          fill: COLORS.paperStrong,
        });
      }

      index += 1;
    }

    if (imported.length) {
      get().addMany(imported);
      set({ panel: null, toast: { message: `${imported.length} file${imported.length === 1 ? '' : 's'} imported` } });
    }
  },

  placeScientificMethod: () => {
    const { camera, viewport } = get();
    const cx = (viewport.w / 2 - camera.x) / camera.scale;
    const cy = (viewport.h / 2 - camera.y) / camera.scale;
    const nodes = scientificMethodMindMap({ x: cx, y: cy });
    get().addMany(nodes);
    set({ panel: null, toast: { message: 'Scientific method mind map added' } });
    haptic('branch');
  },

  toggleMindCollapse: (id) => {
    get().updateObjects((objects) => toggleCollapse(objects, id));
  },

  addMindChild: (id) => {
    let newId = '';
    get().updateObjects((objects) => {
      const result = addMindChildObjects(objects, id);
      newId = result.newId;
      return result.objects;
    });
    if (newId) set({ selectedIds: [newId], editingId: newId });
  },

  addMindSibling: (id) => {
    let newId = '';
    get().updateObjects((objects) => {
      const result = addMindSiblingObjects(objects, id);
      newId = result.newId;
      return result.objects;
    });
    if (newId) set({ selectedIds: [newId], editingId: newId });
  },

  tidyMindMap: (id) => {
    get().updateObjects((objects) => tidyMindMapObjects(objects, id));
  },

  simplifyMindDepth: (id, depth) => {
    get().updateObjects((objects) => simplifyMindDepthObjects(objects, id, depth));
  },

  copySelection: () => {
    const ids = new Set(get().selectedIds);
    if (!ids.size) return;

    const selectedObjects = get().objects.filter((obj) => ids.has(obj.id) && obj.type !== 'connector');
    const connectors = get().objects.filter(
      (obj): obj is ConnectorObject =>
        obj.type === 'connector' && (ids.has(obj.id) || (ids.has(obj.fromId) && ids.has(obj.toId))),
    );

    set({
      clipboard: {
        version: 1,
        objects: clone(selectedObjects),
        connectors: clone(connectors),
      },
      toast: { message: 'Copied selection' },
    });
  },

  pasteClipboard: () => {
    const payload = get().clipboard;
    if (!payload?.objects.length) return;

    get().pushHistory();
    const idMap = new Map<string, string>();
    const topZ = maxZIndex(get().objects) + 1;

    payload.objects.forEach((obj) => {
      idMap.set(obj.id, pastedIdFor(obj));
    });

    const objects = payload.objects.map((obj, index) => {
      const id = idMap.get(obj.id)!;
      const copy = { ...clone(obj), id, x: obj.x + 32, y: obj.y + 32, zIndex: topZ + index } as BoardObject;

      if (copy.type === 'mindmap' && copy.parentId) {
        copy.parentId = idMap.get(copy.parentId) ?? null;
      }

      if (copy.type === 'task') {
        copy.dependsOn = obj.type === 'task' ? obj.dependsOn.flatMap((id) => idMap.get(id) ?? []) : [];
      }

      return copy;
    });
    const connectors = payload.connectors
      .filter((connector) => idMap.has(connector.fromId) && idMap.has(connector.toId))
      .map((connector, index) => ({
        ...clone(connector),
        id: uid('conn'),
        fromId: idMap.get(connector.fromId)!,
        toId: idMap.get(connector.toId)!,
        zIndex: topZ + objects.length + index,
      }));

    set((s) => ({
      objects: recomputeTaskStates([...s.objects, ...objects, ...connectors]),
      selectedIds: objects.map((obj) => obj.id),
      editingId: null,
      panel: null,
    }));
    void get().persist();
  },

  setRegionProps: (id, patch) => {
    get().updateObjects((objects) =>
      objects.map((obj) => (obj.id === id && obj.type === 'region' ? { ...obj, ...patch } : obj)),
    );
  },

  setBackgroundEdit: (backgroundEdit) => {
    get().setPrefs({ backgroundEdit });
  },

  setFilesSheet: (filesSheet) => {
    get().setPrefs({ filesSheet });
  },

  openMarkdown: (id) => {
    set({ markdownEditorId: id, panel: 'markdown', selectedIds: [id] });
  },

  saveMarkdown: (id, content) => {
    get().updateObjects((objects) =>
      objects.map((obj) => (obj.id === id && obj.type === 'markdown' ? { ...obj, content } : obj)),
    );
    set({ markdownEditorId: null, panel: null });
  },

  closeMarkdown: () => {
    set({ markdownEditorId: null, panel: null });
  },

  openAudio: (id) => {
    set({ audioPlayerId: id, panel: 'audio', selectedIds: [id] });
  },

  closeAudio: () => {
    set({ audioPlayerId: null, panel: null });
  },

  applyTextFormat: (patch) => {
    const textFormat = { ...get().prefs.textFormat, ...patch };
    get().setPrefs({ textFormat });
    get().updateObjects((objects) =>
      objects.map((obj) => {
        if (!get().selectedIds.includes(obj.id) || obj.type !== 'text') return obj;
        return {
          ...obj,
          fontSize: patch.fontSize ?? obj.fontSize,
          fontWeight: patch.fontWeight ?? obj.fontWeight,
          color: patch.color ?? obj.color,
          align: patch.align ?? obj.align,
        };
      }),
    );
    set({ panel: 'textFormat' });
  },

  setToast: (toast) => set({ toast }),
  setPdfReader: (id) => set({ pdfReader: id ? { id } : null }),
  setDrawingId: (id) => set({ drawingId: id }),

  appendDrawPoints: (points, start) => {
    const { drawingId, prefs, objects } = get();
    if (start || !drawingId) {
      const id = uid('drawing');
      const minX = Math.min(...points.filter((_, i) => i % 2 === 0));
      const minY = Math.min(...points.filter((_, i) => i % 2 === 1));
      get().addObject({
        id,
        type: 'drawing',
        x: minX - 20,
        y: minY - 20,
        width: 280,
        height: 280,
        zIndex: objects.reduce((m, o) => Math.max(m, o.zIndex), 0) + 1,
        paths: [
          {
            color: prefs.draw.color,
            width: prefs.draw.width,
            tool: prefs.draw.tool,
            points: points.map((p, i) => (i % 2 === 0 ? p - (minX - 20) : p - (minY - 20))),
          },
        ],
      });
      set({ drawingId: id });
      return;
    }
    get().updateObjects((objs) =>
      objs.map((o) => {
        if (o.id !== drawingId || o.type !== 'drawing') return o;
        const paths = [...o.paths];
        const last = { ...paths[paths.length - 1] };
        const local = points.map((p, i) => (i % 2 === 0 ? p - o.x : p - o.y));
        last.points = [...last.points, ...local];
        paths[paths.length - 1] = last;
        const xs = last.points.filter((_, i) => i % 2 === 0);
        const ys = last.points.filter((_, i) => i % 2 === 1);
        return {
          ...o,
          paths,
          width: Math.max(o.width, Math.max(...xs) + 40),
          height: Math.max(o.height, Math.max(...ys) + 40),
        };
      }),
      false,
    );
  },
}));
