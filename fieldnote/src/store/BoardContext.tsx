import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Board, BoardItem, DraftBoardItem, PanelKind } from '../types';
import { createMainBoard, uid } from '../lib/seed';
import { clearAllBoards, loadBoards, saveBoards } from '../lib/storage';
import { colors } from '../theme';

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
  setPanel: (p: PanelKind) => void;
  setTool: (t: Tool) => void;
  setDrawColor: (c: string) => void;
  setDrawWidth: (w: number) => void;
  select: (ids: string[], additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  updateItems: (updater: (items: BoardItem[]) => BoardItem[], pushHistory?: boolean) => void;
  moveItems: (ids: string[], dx: number, dy: number, commit?: boolean) => void;
  resizeItem: (id: string, width: number, height: number, commit?: boolean) => void;
  updateText: (id: string, text: string) => void;
  toggleTask: (id: string) => void;
  addItem: (item: DraftBoardItem) => string;
  addItems: (items: DraftBoardItem[]) => string[];
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  createBoard: (name?: string) => void;
  renameBoard: (id: string, name: string) => void;
  switchBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
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

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const moveItems = useCallback(
    (ids: string[], dx: number, dy: number, _commit = false) => {
      if (dx === 0 && dy === 0) return;
      updateItems(
        (items) =>
          items.map((it) =>
            ids.includes(it.id) ? { ...it, x: it.x + dx, y: it.y + dy } : it,
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

  const updateText = useCallback(
    (id: string, text: string) => {
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id && (it.type === 'text' || it.type === 'task' || it.type === 'mindmap')
              ? { ...it, text }
              : it,
          ),
        false,
      );
    },
    [updateItems],
  );

  const toggleTask = useCallback(
    (id: string) => {
      updateItems((items) =>
        items.map((it) => (it.id === id && it.type === 'task' ? { ...it, done: !it.done } : it)),
      );
    },
    [updateItems],
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
    },
    [pushHistory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [cloneBoards(boardsRef.current), ...f].slice(0, 50));
      setBoards(prev);
      setSelectedIds([]);
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
    setPanel,
    setTool,
    setDrawColor: setDrawColorState,
    setDrawWidth,
    select,
    selectAll,
    clearSelection,
    updateItems,
    moveItems,
    resizeItem,
    updateText,
    toggleTask,
    addItem,
    addItems,
    deleteSelected,
    duplicateSelected,
    bringToFront,
    sendToBack,
    createBoard,
    renameBoard,
    switchBoard,
    deleteBoard,
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
