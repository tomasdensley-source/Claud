import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Board, BoardItem, DraftBoardItem, Landmark, PanelKind } from '../types';
import { createMainBoard, uid } from '../lib/seed';
import {
  archiveBoardLocal,
  clearAllBoards,
  loadBoards,
  loadLandmarks,
  removeLandmark,
  saveBoards,
  saveLandmark,
} from '../lib/storage';
import { colors } from '../theme';
import { canCompleteTask, syncConnectorGlow } from '../lib/taskGraph';
import { tidyMindMap, toggleCollapsed } from '../lib/mindMap';
import { assignRegionParents, regionToJsonCanvas, regionToMarkdown } from '../lib/regions';
import {
  boardToJsonCanvas,
  jsonCanvasToItems,
  layoutRepair,
  parseJsonCanvas,
  repairAiJson,
  stringifyJsonCanvas,
} from '../lib/jsonCanvas';
import { saveSnapshot } from '../lib/snapshots';
import { hapticImpact, hapticSuccess, hapticWarning } from '../lib/haptics';

export type Tool = 'select' | 'draw' | 'multi';

interface BoardContextValue {
  ready: boolean;
  boards: Board[];
  currentBoard: Board;
  selectedIds: string[];
  tool: Tool;
  drawColor: string;
  drawWidth: number;
  panel: PanelKind;
  canUndo: boolean;
  canRedo: boolean;
  lastSavedAt: number | null;
  itemCount: number;
  focusedRegionId: string | null;
  landmarks: Landmark[];
  setPanel: (p: PanelKind) => void;
  setTool: (t: Tool) => void;
  setDrawColor: (c: string) => void;
  setDrawWidth: (w: number) => void;
  select: (ids: string[], additive?: boolean) => void;
  selectAll: () => void;
  selectInRect: (rect: { x: number; y: number; width: number; height: number }, additive?: boolean) => void;
  clearSelection: () => void;
  applyColorToSelected: (color: string, target: 'frame' | 'body') => void;
  updateItems: (updater: (items: BoardItem[]) => BoardItem[], pushHistory?: boolean) => void;
  moveItems: (ids: string[], dx: number, dy: number, commit?: boolean) => void;
  resizeItem: (id: string, width: number, height: number, commit?: boolean) => void;
  resizeItemBox: (
    id: string,
    next: { x: number; y: number; width: number; height: number },
    commit?: boolean,
  ) => void;
  updateText: (id: string, text: string) => void;
  toggleTask: (id: string) => { ok: boolean; reason?: string };
  completeTask: (id: string) => { ok: boolean; reason?: string };
  addItem: (item: DraftBoardItem) => string;
  addItems: (items: DraftBoardItem[]) => string[];
  replaceBoardItems: (items: BoardItem[], recordHistory?: boolean) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  toggleMindMapCollapse: (id: string) => void;
  tidySelectedMindMap: () => void;
  setMindMapDepth: (depth: number | 'all') => void;
  mindMapDepth: number | 'all';
  exportJsonCanvas: () => string;
  importJsonCanvasText: (raw: string) => { ok: boolean; error?: string; count?: number };
  pasteAiBoard: (raw: string) => { ok: boolean; error?: string; count?: number };
  createBoard: (name?: string) => void;
  renameBoard: (id: string, name: string) => void;
  switchBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (id: string) => void;
  archiveBoard: (id: string) => Promise<void>;
  enterRegion: (regionId: string) => void;
  exitRegion: () => void;
  exportRegion: (
    regionId: string,
    format: 'markdown' | 'canvas',
  ) => { ok: boolean; text?: string; error?: string };
  updateDrawingStyle: (id: string, patch: { color?: string; width?: number }) => void;
  addLandmarkAt: (name: string, x: number, y: number, zoom?: number) => Promise<Landmark>;
  deleteLandmark: (id: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
  beginHistory: () => void;
  resetToSeed: () => Promise<void>;
  appendDrawingPoint: (
    itemId: string | null,
    point: { x: number; y: number },
    startNewPath: boolean,
  ) => string;
  addDrawingStroke: (
    worldPoints: { x: number; y: number }[],
    color: string,
    width: number,
  ) => string | null;
}

const BoardContext = createContext<BoardContextValue | null>(null);

function cloneBoards(boards: Board[]): Board[] {
  return JSON.parse(JSON.stringify(boards)) as Board[];
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [boards, setBoards] = useState<Board[]>([createMainBoard()]);
  const [currentBoardId, setCurrentBoardId] = useState('main');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [drawColor, setDrawColorState] = useState<string>(colors.ink);
  const [drawWidth, setDrawWidth] = useState(3);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [history, setHistory] = useState<Board[][]>([]);
  const [future, setFuture] = useState<Board[][]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [mindMapDepth, setMindMapDepth] = useState<number | 'all'>('all');
  const [focusedRegionId, setFocusedRegionId] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardsRef = useRef(boards);
  const currentBoardIdRef = useRef(currentBoardId);
  boardsRef.current = boards;
  currentBoardIdRef.current = currentBoardId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadBoards();
        if (cancelled) return;
        setBoards(loaded.boards);
        setCurrentBoardId(loaded.currentBoardId);
      } catch (error) {
        console.warn('Fieldnote failed to load boards; using seed board', error);
        if (cancelled) return;
        const seed = createMainBoard();
        setBoards([seed]);
        setCurrentBoardId(seed.id);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveBoards(boards, currentBoardId).then(() => setLastSavedAt(Date.now()));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boards, currentBoardId, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadLandmarks(currentBoardId).then((list) => {
      if (!cancelled) setLandmarks(list);
    });
    return () => {
      cancelled = true;
    };
  }, [currentBoardId, ready]);

  const currentBoard = useMemo(
    () => boards.find((b) => b.id === currentBoardId) ?? boards[0],
    [boards, currentBoardId],
  );

  const itemCount = useMemo(
    () => boards.reduce((n, b) => n + b.items.length, 0),
    [boards],
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-50), cloneBoards(boardsRef.current)]);
    setFuture([]);
  }, []);

  const replaceCurrentItems = useCallback(
    (items: BoardItem[], recordHistory: boolean) => {
      if (recordHistory) pushHistory();
      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoardIdRef.current ? { ...b, items, updatedAt: Date.now() } : b,
        ),
      );
    },
    [pushHistory],
  );

  const updateItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[], recordHistory = true) => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      if (!board) return;
      const next = updater(board.items);
      replaceCurrentItems(next, recordHistory);
    },
    [replaceCurrentItems],
  );

  const select = useCallback((ids: string[], additive = false) => {
    setSelectedIds((prev) => {
      if (!additive) return ids;
      const set = new Set(prev);
      ids.forEach((id) => {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      });
      return Array.from(set);
    });
  }, []);

  const selectAll = useCallback(() => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    setSelectedIds(board ? board.items.map((it) => it.id) : []);
  }, []);

  const selectInRect = useCallback((rect: { x: number; y: number; width: number; height: number }, additive = false) => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    if (!board) return;
    const left = Math.min(rect.x, rect.x + rect.width);
    const top = Math.min(rect.y, rect.y + rect.height);
    const right = Math.max(rect.x, rect.x + rect.width);
    const bottom = Math.max(rect.y, rect.y + rect.height);
    const hits = board.items
      .filter((it) => {
        if (it.type === 'connector') return false;
        const ix2 = it.x + it.width;
        const iy2 = it.y + it.height;
        return it.x < right && ix2 > left && it.y < bottom && iy2 > top;
      })
      .map((it) => it.id);
    setSelectedIds((prev) => {
      if (!additive) return hits;
      return Array.from(new Set([...prev, ...hits]));
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const applyColorToSelected = useCallback(
    (color: string, target: 'frame' | 'body') => {
      if (selectedIds.length === 0) return;
      updateItems((items) =>
        items.map((it) => {
          if (!selectedIds.includes(it.id)) return it;
          if (target === 'frame') {
            if (it.type === 'region') return { ...it, frameColor: color, backgroundColor: color };
            return { ...it, backgroundColor: color };
          }
          if (it.type === 'text' || it.type === 'task' || it.type === 'mindmap') {
            return { ...it, color };
          }
          if (it.type === 'connector' || it.type === 'drawing' || it.type === 'shape') {
            return { ...it, color };
          }
          return { ...it, color };
        }),
      );
    },
    [selectedIds, updateItems],
  );

  const moveItems = useCallback(
    (ids: string[], dx: number, dy: number, _commit = false) => {
      if (dx === 0 && dy === 0) return;
      updateItems(
        (items) =>
          items.map((it) =>
            ids.includes(it.id) && !it.locked ? { ...it, x: it.x + dx, y: it.y + dy } : it,
          ),
        false,
      );
    },
    [updateItems],
  );

  const beginHistory = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const resizeItem = useCallback(
    (id: string, width: number, height: number, commit = false) => {
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id
              ? { ...it, width: Math.max(64, width), height: Math.max(48, height) }
              : it,
          ),
        commit,
      );
    },
    [updateItems],
  );

  const resizeItemBox = useCallback(
    (
      id: string,
      next: { x: number; y: number; width: number; height: number },
      commit = false,
    ) => {
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  x: next.x,
                  y: next.y,
                  width: Math.max(72, next.width),
                  height: Math.max(56, next.height),
                }
              : it,
          ),
        commit,
      );
    },
    [updateItems],
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      updateItems(
        (items) =>
          items.map((it) => {
            if (it.id !== id) return it;
            if (it.type === 'text') {
              const markdown =
                it.markdown ||
                /(^|\n)#{1,3}\s|\*\*[^*]+\*\*|`[^`]+`|(^|\n)[-*+]\s/.test(text);
              return { ...it, text, markdown: markdown || it.markdown };
            }
            if (it.type === 'task' || it.type === 'mindmap') {
              return { ...it, text };
            }
            return it;
          }),
        false,
      );
    },
    [updateItems],
  );

  const toggleTask = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      if (!board) return { ok: false, reason: 'No board' };
      const task = board.items.find((it) => it.id === id && it.type === 'task');
      if (!task || task.type !== 'task') return { ok: false, reason: 'Not a task' };
      if (task.done) {
        updateItems((items) =>
          syncConnectorGlow(
            items.map((it) => (it.id === id && it.type === 'task' ? { ...it, done: false } : it)),
          ),
        );
        void hapticImpact('light');
        return { ok: true };
      }
      void hapticWarning();
      return {
        ok: false,
        reason: 'Hold the task for 3 seconds to complete it',
      };
    },
    [updateItems],
  );

  const completeTask = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      if (!board) return { ok: false, reason: 'No board' };
      const task = board.items.find((it) => it.id === id && it.type === 'task');
      if (!task || task.type !== 'task') return { ok: false, reason: 'Not a task' };
      if (task.done) return { ok: true };
      if (!canCompleteTask(task, board.items)) {
        void hapticWarning();
        return { ok: false, reason: 'Waiting on dependency water-flow' };
      }
      updateItems((items) =>
        syncConnectorGlow(
          items.map((it) => (it.id === id && it.type === 'task' ? { ...it, done: true } : it)),
        ),
      );
      void hapticSuccess();
      return { ok: true };
    },
    [updateItems],
  );

  const replaceBoardItems = useCallback(
    (items: BoardItem[], recordHistory = true) => {
      replaceCurrentItems(assignRegionParents(syncConnectorGlow(items)), recordHistory);
    },
    [replaceCurrentItems],
  );

  const toggleMindMapCollapse = useCallback(
    (id: string) => {
      updateItems((items) => toggleCollapsed(items, id));
    },
    [updateItems],
  );

  const tidySelectedMindMap = useCallback(() => {
    const id = selectedIds[0];
    if (!id) return;
    updateItems((items) => {
      const target = items.find((it) => it.id === id && it.type === 'mindmap');
      if (!target) return items;
      return tidyMindMap(items, target.id);
    });
  }, [selectedIds, updateItems]);

  const exportJsonCanvas = useCallback(() => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    if (!board) return stringifyJsonCanvas({ nodes: [], edges: [] });
    return stringifyJsonCanvas(boardToJsonCanvas(board));
  }, []);

  const importJsonCanvasText = useCallback(
    (raw: string): { ok: boolean; error?: string; count?: number } => {
      try {
        const doc = parseJsonCanvas(raw);
        const imported = layoutRepair(jsonCanvasToItems(doc));
        if (imported.length === 0) return { ok: false, error: 'No nodes found' };
        updateItems((items) => assignRegionParents(syncConnectorGlow([...items, ...imported])));
        return { ok: true, count: imported.length };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [updateItems],
  );

  const pasteAiBoard = useCallback(
    (raw: string): { ok: boolean; error?: string; count?: number } => {
      try {
        const repaired = repairAiJson(raw);
        const doc = parseJsonCanvas(repaired);
        const imported = layoutRepair(jsonCanvasToItems(doc));
        if (imported.length === 0) return { ok: false, error: 'No nodes found' };
        void saveSnapshot(boardsRef.current, currentBoardIdRef.current, 'Before Paste AI');
        replaceBoardItems(imported, true);
        return { ok: true, count: imported.length };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    },
    [replaceBoardItems],
  );

  const addItem = useCallback(
    (partial: DraftBoardItem) => {
      const id = partial.id || uid(partial.type);
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      const zIndex =
        partial.zIndex ||
        (board?.items.reduce((m, it) => Math.max(m, it.zIndex), 0) ?? 0) + 1;
      const item = { ...partial, id, zIndex } as BoardItem;
      updateItems((items) => [...items, item]);
      setSelectedIds([id]);
      return id;
    },
    [updateItems],
  );

  const addItems = useCallback(
    (partials: DraftBoardItem[]) => {
      if (partials.length === 0) return [];
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      let z = board?.items.reduce((m, it) => Math.max(m, it.zIndex), 0) ?? 0;
      const ids: string[] = [];
      const created: BoardItem[] = partials.map((partial) => {
        const id = partial.id || uid(partial.type);
        ids.push(id);
        z += 1;
        return { ...partial, id, zIndex: partial.zIndex ?? z } as BoardItem;
      });
      updateItems((items) => [...items, ...created]);
      setSelectedIds(ids);
      return ids;
    },
    [updateItems],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => items.filter((it) => !selectedIds.includes(it.id)));
    setSelectedIds([]);
    void hapticImpact('medium');
  }, [selectedIds, updateItems]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    if (!board) return;
    const copies: BoardItem[] = [];
    const newIds: string[] = [];
    board.items.forEach((it) => {
      if (!selectedIds.includes(it.id)) return;
      const id = uid(it.type);
      newIds.push(id);
      copies.push({ ...JSON.parse(JSON.stringify(it)), id, x: it.x + 28, y: it.y + 28 });
    });
    updateItems((items) => [...items, ...copies]);
    setSelectedIds(newIds);
    void hapticImpact('light');
  }, [selectedIds, updateItems]);

  const bringToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => {
      const maxZ = items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      let next = maxZ + 1;
      return items.map((it) =>
        selectedIds.includes(it.id) ? { ...it, zIndex: next++ } : it,
      );
    });
  }, [selectedIds, updateItems]);

  const sendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => {
      const minZ = items.reduce((m, it) => Math.min(m, it.zIndex), 0);
      let next = minZ - selectedIds.length;
      return items.map((it) =>
        selectedIds.includes(it.id) ? { ...it, zIndex: next++ } : it,
      );
    });
  }, [selectedIds, updateItems]);

  const createBoard = useCallback(
    (name?: string) => {
      pushHistory();
      const board: Board = {
        id: uid('board'),
        name: name ?? `Board ${boardsRef.current.length + 1}`,
        items: [],
        updatedAt: Date.now(),
      };
      setBoards((prev) => [...prev, board]);
      setCurrentBoardId(board.id);
      setSelectedIds([]);
      setTool('select');
      void hapticSuccess();
    },
    [pushHistory],
  );

  const renameBoard = useCallback((id: string, name: string) => {
    const trimmed = name.trim() || 'Untitled board';
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: trimmed, updatedAt: Date.now() } : b)),
    );
  }, []);

  const switchBoard = useCallback((id: string) => {
    setCurrentBoardId(id);
    setSelectedIds([]);
    setPanel(null);
    setTool('select');
    setFocusedRegionId(null);
    void hapticImpact('light');
  }, []);

  const deleteBoard = useCallback(
    (id: string) => {
      if (boardsRef.current.length <= 1) return;
      pushHistory();
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (id === currentBoardIdRef.current) setCurrentBoardId(next[0].id);
        return next;
      });
      setSelectedIds([]);
      setFocusedRegionId(null);
    },
    [pushHistory],
  );

  const duplicateBoard = useCallback(
    (id: string) => {
      const src = boardsRef.current.find((b) => b.id === id);
      if (!src) return;
      pushHistory();
      const copy = cloneBoards([src])[0];
      copy.id = uid('board');
      copy.name = `${src.name} copy`;
      copy.updatedAt = Date.now();
      copy.archived = false;
      setBoards((prev) => [...prev, copy]);
      setCurrentBoardId(copy.id);
      setSelectedIds([]);
      setFocusedRegionId(null);
      setTool('select');
    },
    [pushHistory],
  );

  const archiveBoard = useCallback(
    async (id: string) => {
      if (boardsRef.current.length <= 1) return;
      const board = boardsRef.current.find((b) => b.id === id);
      if (!board) return;
      pushHistory();
      await archiveBoardLocal(board);
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (id === currentBoardIdRef.current && next[0]) setCurrentBoardId(next[0].id);
        return next;
      });
      setSelectedIds([]);
      setFocusedRegionId(null);
    },
    [pushHistory],
  );

  const enterRegion = useCallback((regionId: string) => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    const region = board?.items.find((it) => it.id === regionId && it.type === 'region');
    if (!region) return;
    setFocusedRegionId(regionId);
    setSelectedIds([]);
    setPanel(null);
    void hapticSuccess();
  }, []);

  const exitRegion = useCallback(() => {
    setFocusedRegionId(null);
  }, []);

  const exportRegion = useCallback(
    (regionId: string, format: 'markdown' | 'canvas') => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      if (!board) return { ok: false as const, error: 'No board' };
      const region = board.items.find((it) => it.id === regionId && it.type === 'region');
      if (!region) return { ok: false as const, error: 'Region not found' };
      try {
        const text =
          format === 'markdown'
            ? regionToMarkdown(board.items, regionId)
            : regionToJsonCanvas(board, regionId);
        return { ok: true as const, text };
      } catch (e) {
        return { ok: false as const, error: String(e) };
      }
    },
    [],
  );

  const updateDrawingStyle = useCallback(
    (id: string, patch: { color?: string; width?: number }) => {
      updateItems((items) =>
        items.map((it) => {
          if (it.id !== id || it.type !== 'drawing') return it;
          return {
            ...it,
            paths: it.paths.map((p) => ({
              ...p,
              color: patch.color ?? p.color,
              width: patch.width ?? p.width,
            })),
          };
        }),
      );
    },
    [updateItems],
  );

  const addLandmarkAt = useCallback(
    async (name: string, x: number, y: number, zoom?: number) => {
      const landmark: Landmark = {
        id: uid('lm'),
        boardId: currentBoardIdRef.current,
        name: name.trim() || 'Place',
        x,
        y,
        zoom,
        createdAt: Date.now(),
      };
      await saveLandmark(landmark);
      setLandmarks((prev) => [landmark, ...prev.filter((l) => l.id !== landmark.id)]);
      return landmark;
    },
    [],
  );

  const deleteLandmark = useCallback(async (id: string) => {
    await removeLandmark(id);
    setLandmarks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [cloneBoards(boardsRef.current), ...f].slice(0, 50));
      setBoards(prev);
      setSelectedIds([]);
      void hapticImpact('medium');
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, cloneBoards(boardsRef.current)].slice(-50));
      setBoards(next);
      setSelectedIds([]);
      void hapticImpact('medium');
      return rest;
    });
  }, []);

  const resetToSeed = useCallback(async () => {
    await clearAllBoards();
    const main = createMainBoard();
    setBoards([main]);
    setCurrentBoardId(main.id);
    setSelectedIds([]);
    setHistory([]);
    setFuture([]);
    setTool('select');
    setPanel(null);
    setFocusedRegionId(null);
    setLandmarks([]);
  }, []);

  const appendDrawingPoint = useCallback(
    (itemId: string | null, point: { x: number; y: number }, startNewPath: boolean) => {
      let targetId = itemId;
      const pad = 48;
      if (!targetId) {
        targetId = uid('drawing');
        const item: BoardItem = {
          id: targetId,
          type: 'drawing',
          x: point.x - pad,
          y: point.y - pad,
          width: pad * 2,
          height: pad * 2,
          zIndex:
            (boardsRef.current
              .find((b) => b.id === currentBoardIdRef.current)
              ?.items.reduce((m, it) => Math.max(m, it.zIndex), 0) ?? 0) + 1,
          paths: [{ color: drawColor, width: drawWidth, points: [{ x: pad, y: pad }] }],
        };
        updateItems((items) => [...items, item], true);
        return targetId;
      }
      updateItems((items) =>
        items.map((it) => {
          if (it.id !== targetId || it.type !== 'drawing') return it;
          let originX = it.x;
          let originY = it.y;
          let localX = point.x - originX;
          let localY = point.y - originY;
          let width = it.width;
          let height = it.height;
          let paths = it.paths;

          if (localX < pad) {
            const shift = pad - localX;
            originX -= shift;
            width += shift;
            localX += shift;
            paths = paths.map((p) => ({
              ...p,
              points: p.points.map((pt) => ({ x: pt.x + shift, y: pt.y })),
            }));
          }
          if (localY < pad) {
            const shift = pad - localY;
            originY -= shift;
            height += shift;
            localY += shift;
            paths = paths.map((p) => ({
              ...p,
              points: p.points.map((pt) => ({ x: pt.x, y: pt.y + shift })),
            }));
          }
          if (localX + pad > width) width = localX + pad;
          if (localY + pad > height) height = localY + pad;

          const local = { x: localX, y: localY };
          paths = [...paths];
          if (startNewPath || paths.length === 0) {
            paths.push({ color: drawColor, width: drawWidth, points: [local] });
          } else {
            const last = { ...paths[paths.length - 1] };
            last.points = [...last.points, local];
            paths[paths.length - 1] = last;
          }
          return { ...it, x: originX, y: originY, paths, width, height };
        }),
        false,
      );
      return targetId;
    },
    [drawColor, drawWidth, updateItems],
  );

  const addDrawingStroke = useCallback(
    (worldPoints: { x: number; y: number }[], color: string, width: number) => {
      if (worldPoints.length === 0) return null;
      const pad = Math.max(24, width * 4);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of worldPoints) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const x = minX - pad;
      const y = minY - pad;
      const itemWidth = Math.max(pad * 2, maxX - minX + pad * 2);
      const itemHeight = Math.max(pad * 2, maxY - minY + pad * 2);
      const localPoints = worldPoints.map((p) => ({ x: p.x - x, y: p.y - y }));
      const id = uid('drawing');
      const zIndex =
        (boardsRef.current
          .find((b) => b.id === currentBoardIdRef.current)
          ?.items.reduce((m, it) => Math.max(m, it.zIndex), 0) ?? 0) + 1;
      const item: BoardItem = {
        id,
        type: 'drawing',
        x,
        y,
        width: itemWidth,
        height: itemHeight,
        zIndex,
        paths: [{ color, width, points: localPoints }],
      };
      updateItems((items) => [...items, item], true);
      return id;
    },
    [updateItems],
  );

  const value: BoardContextValue = {
    ready,
    boards,
    currentBoard,
    selectedIds,
    tool,
    drawColor,
    drawWidth,
    panel,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    lastSavedAt,
    itemCount,
    focusedRegionId,
    landmarks,
    setPanel,
    setTool,
    setDrawColor: setDrawColorState,
    setDrawWidth,
    select,
    selectAll,
    selectInRect,
    clearSelection,
    applyColorToSelected,
    updateItems,
    moveItems,
    resizeItem,
    resizeItemBox,
    updateText,
    toggleTask,
    completeTask,
    addItem,
    addItems,
    replaceBoardItems,
    deleteSelected,
    duplicateSelected,
    bringToFront,
    sendToBack,
    toggleMindMapCollapse,
    tidySelectedMindMap,
    setMindMapDepth,
    mindMapDepth,
    exportJsonCanvas,
    importJsonCanvasText,
    pasteAiBoard,
    createBoard,
    renameBoard,
    switchBoard,
    deleteBoard,
    duplicateBoard,
    archiveBoard,
    enterRegion,
    exitRegion,
    exportRegion,
    updateDrawingStyle,
    addLandmarkAt,
    deleteLandmark,
    undo,
    redo,
    beginHistory,
    resetToSeed,
    appendDrawingPoint,
    addDrawingStroke,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
