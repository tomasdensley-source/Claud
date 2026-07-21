import { create } from 'zustand';
import type {
  BoardObject,
  BoardSnapshot,
  Camera,
  ConnectorObject,
  Panel,
  Side,
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
} from '../lib/persistence';
import { createMainBoard, scientificMethodMindMap, uid } from '../lib/seed';
import { COLORS } from '../lib/theme';
import { haptic } from '../lib/haptics';

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

  bootstrap: () => Promise<void>;
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
  placeScientificMethod: () => void;
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
  prefs: loadPrefs(),
  files: [],
  history: [],
  future: [],
  connecting: null,
  drawingId: null,
  toast: null,
  pdfReader: null,
  viewport: { w: 390, h: 844 },

  bootstrap: async () => {
    const { boards, currentId } = await loadBoards();
    const current = boards.find((b) => b.id === currentId) ?? boards[0] ?? createMainBoard();
    const files = await loadFiles();
    set({
      ready: true,
      boards,
      currentId: current.id,
      objects: recomputeTaskStates(current.objects),
      camera: current.camera,
      files,
      panel: current.objects.length <= 4 ? 'onboarding' : null,
    });
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
      objects: s.objects.map((o) => (ids.has(o.id) ? { ...o, x: o.x + dx, y: o.y + dy } : o)),
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
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b)),
    }));
    const b = get().boards.find((x) => x.id === id);
    if (b) void saveBoard(b);
  },

  removeBoard: async (id) => {
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
    }, 280);
  },

  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    set({ prefs });
    savePrefs(prefs);
  },

  addWorkingFile: async (file) => {
    await saveFile(file);
    set((s) => ({ files: [...s.files.filter((f) => f.id !== file.id), file] }));
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
