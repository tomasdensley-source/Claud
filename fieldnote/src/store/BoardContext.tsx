import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Board, BoardItem, DraftBoardItem, PaletteTarget, PanelKind } from '../types';
import { createMainBoard, uid } from '../lib/seed';
import {
  clearAllBoards,
  loadBoards,
  loadPaletteSlots,
  saveBoards,
  savePaletteSlots,
} from '../lib/storage';
import { parseJSONCanvas, serializeJSONCanvas } from '../lib/jsoncanvas';
import { repairBoardItems } from '../lib/normalize';
import { colors } from '../theme';

type Tool = 'select' | 'draw' | 'multi';

// Seeds for the palette's 5 persistent custom slots — a small starting set
// from the existing Fieldnote palette, not a fixed requirement; every slot is
// user-editable and persists across sessions independent of board content.
const DEFAULT_PALETTE_SLOTS = [
  colors.clay,
  colors.amber,
  colors.tipBlue,
  colors.clayDeep,
  colors.ink,
];

interface BoardContextValue {
  ready: boolean;
  boards: Board[];
  currentBoard: Board;
  selectedIds: string[];
  tool: Tool;
  drawColor: string;
  panel: PanelKind;
  canUndo: boolean;
  canRedo: boolean;
  setPanel: (p: PanelKind) => void;
  setTool: (t: Tool) => void;
  setDrawColor: (c: string) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  updateItems: (updater: (items: BoardItem[]) => BoardItem[], pushHistory?: boolean) => void;
  moveItems: (ids: string[], dx: number, dy: number, commit?: boolean) => void;
  resizeItem: (id: string, width: number, height: number, commit?: boolean) => void;
  updateText: (id: string, text: string) => void;
  toggleTask: (id: string) => void;
  addItem: (item: DraftBoardItem) => string;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  createBoard: (name?: string) => void;
  renameBoard: (id: string, name: string) => void;
  switchBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
  undo: () => void;
  redo: () => void;
  resetToSeed: () => Promise<void>;
  appendDrawingPoint: (
    itemId: string | null,
    point: { x: number; y: number },
    startNewPath: boolean,
  ) => string;
  exportBoardAsJSONCanvas: () => string;
  importJSONCanvas: (raw: string, mode: 'replace' | 'append') => ImportOutcome;
  repairCurrentBoard: () => { changed: boolean; issues: string[] };
  paletteOpen: boolean;
  paletteTarget: PaletteTarget;
  paletteSlots: string[];
  setPaletteOpen: (open: boolean) => void;
  setPaletteTarget: (target: PaletteTarget) => void;
  setPaletteSlot: (index: number, color: string) => void;
  applyPaletteColor: (color: string) => void;
}

export interface ImportOutcome {
  ok: boolean;
  issues: string[];
  count?: number;
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
  const [panel, setPanel] = useState<PanelKind>(null);
  const [history, setHistory] = useState<Board[][]>([]);
  const [future, setFuture] = useState<Board[][]>([]);
  // Default closed every launch — only the 5 custom slots persist, not whether
  // the palette itself was left open.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTarget, setPaletteTarget] = useState<PaletteTarget>('frame');
  const [paletteSlots, setPaletteSlots] = useState<string[]>(DEFAULT_PALETTE_SLOTS);
  const paletteReady = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardsRef = useRef(boards);
  boardsRef.current = boards;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadBoards();
      if (cancelled) return;
      setBoards(loaded.boards);
      setCurrentBoardId(loaded.currentBoardId);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slots = await loadPaletteSlots(DEFAULT_PALETTE_SLOTS);
      if (cancelled) return;
      setPaletteSlots(slots);
      paletteReady.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paletteReady.current) return;
    void savePaletteSlots(paletteSlots);
  }, [paletteSlots]);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveBoards(boards, currentBoardId);
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boards, currentBoardId, ready]);

  const currentBoard = useMemo(
    () => boards.find((b) => b.id === currentBoardId) ?? boards[0],
    [boards, currentBoardId],
  );

  const pushHistory = useCallback(() => {
    setHistory((h) => [...h.slice(-40), cloneBoards(boardsRef.current)]);
    setFuture([]);
  }, []);

  const replaceCurrentItems = useCallback(
    (items: BoardItem[], recordHistory: boolean) => {
      if (recordHistory) pushHistory();
      setBoards((prev) =>
        prev.map((b) =>
          b.id === currentBoardId ? { ...b, items, updatedAt: Date.now() } : b,
        ),
      );
    },
    [currentBoardId, pushHistory],
  );

  const updateItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[], recordHistory = true) => {
      const next = updater(currentBoard.items);
      replaceCurrentItems(next, recordHistory);
    },
    [currentBoard.items, replaceCurrentItems],
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

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const moveItems = useCallback(
    (ids: string[], dx: number, dy: number, commit = false) => {
      updateItems(
        (items) =>
          items.map((it) =>
            ids.includes(it.id) ? { ...it, x: it.x + dx, y: it.y + dy } : it,
          ),
        commit,
      );
    },
    [updateItems],
  );

  const resizeItem = useCallback(
    (id: string, width: number, height: number, commit = false) => {
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id
              ? { ...it, width: Math.max(80, width), height: Math.max(60, height) }
              : it,
          ),
        commit,
      );
    },
    [updateItems],
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      updateItems((items) =>
        items.map((it) =>
          it.id === id && (it.type === 'text' || it.type === 'task' || it.type === 'mindmap')
            ? { ...it, text }
            : it,
        ),
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
      const zIndex =
        partial.zIndex ||
        currentBoard.items.reduce((m, it) => Math.max(m, it.zIndex), 0) + 1;
      const item = { ...partial, id, zIndex } as BoardItem;
      updateItems((items) => [...items, item]);
      setSelectedIds([id]);
      return id;
    },
    [currentBoard.items, updateItems],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => items.filter((it) => !selectedIds.includes(it.id)));
    setSelectedIds([]);
  }, [selectedIds, updateItems]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copies: BoardItem[] = [];
    const newIds: string[] = [];
    currentBoard.items.forEach((it) => {
      if (!selectedIds.includes(it.id)) return;
      const id = uid(it.type);
      newIds.push(id);
      copies.push({ ...JSON.parse(JSON.stringify(it)), id, x: it.x + 28, y: it.y + 28 });
    });
    updateItems((items) => [...items, ...copies]);
    setSelectedIds(newIds);
  }, [selectedIds, currentBoard.items, updateItems]);

  const createBoard = useCallback((name?: string) => {
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
  }, [pushHistory]);

  const renameBoard = useCallback((id: string, name: string) => {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b)));
  }, []);

  const switchBoard = useCallback((id: string) => {
    setCurrentBoardId(id);
    setSelectedIds([]);
    setPanel(null);
  }, []);

  const deleteBoard = useCallback(
    (id: string) => {
      if (boardsRef.current.length <= 1) return;
      pushHistory();
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (id === currentBoardId) setCurrentBoardId(next[0].id);
        return next;
      });
      setSelectedIds([]);
    },
    [currentBoardId, pushHistory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [cloneBoards(boardsRef.current), ...f].slice(0, 40));
      setBoards(prev);
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, cloneBoards(boardsRef.current)].slice(-40));
      setBoards(next);
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
  }, []);

  const appendDrawingPoint = useCallback(
    (itemId: string | null, point: { x: number; y: number }, startNewPath: boolean) => {
      let targetId = itemId;
      if (!targetId) {
        targetId = uid('drawing');
        const item: BoardItem = {
          id: targetId,
          type: 'drawing',
          x: point.x - 40,
          y: point.y - 40,
          width: 320,
          height: 320,
          zIndex: currentBoard.items.reduce((m, it) => Math.max(m, it.zIndex), 0) + 1,
          paths: [{ color: drawColor, width: 3, points: [{ x: 40, y: 40 }] }],
        };
        updateItems((items) => [...items, item], true);
        return targetId;
      }
      updateItems((items) =>
        items.map((it) => {
          if (it.id !== targetId || it.type !== 'drawing') return it;
          const local = { x: point.x - it.x, y: point.y - it.y };
          const paths = [...it.paths];
          if (startNewPath || paths.length === 0) {
            paths.push({ color: drawColor, width: 3, points: [local] });
          } else {
            const last = { ...paths[paths.length - 1] };
            last.points = [...last.points, local];
            paths[paths.length - 1] = last;
          }
          const maxX = Math.max(it.width, local.x + 40);
          const maxY = Math.max(it.height, local.y + 40);
          return { ...it, paths, width: maxX, height: maxY };
        }),
        false,
      );
      return targetId;
    },
    [currentBoard.items, drawColor, updateItems],
  );

  const setPaletteSlot = useCallback((index: number, color: string) => {
    setPaletteSlots((prev) => prev.map((c, i) => (i === index ? color : c)));
  }, []);

  const applyPaletteColor = useCallback(
    (color: string) => {
      if (selectedIds.length > 0) {
        updateItems(
          (items) =>
            items.map((it) =>
              selectedIds.includes(it.id)
                ? {
                    ...it,
                    ...(paletteTarget === 'frame'
                      ? { backgroundColor: color }
                      : { color }),
                  }
                : it,
            ),
          true,
        );
        return;
      }
      if (tool === 'draw') {
        setDrawColorState(color);
      }
    },
    [paletteTarget, selectedIds, tool, updateItems],
  );

  const exportBoardAsJSONCanvas = useCallback(
    () => serializeJSONCanvas(currentBoard),
    [currentBoard],
  );

  const importJSONCanvas = useCallback(
    (raw: string, mode: 'replace' | 'append'): ImportOutcome => {
      const result = parseJSONCanvas(raw);
      if (result.items.length === 0) {
        return { ok: false, issues: result.issues };
      }
      if (mode === 'replace') {
        pushHistory();
        replaceCurrentItems(result.items, false);
      } else {
        const existingIds = new Set(currentBoard.items.map((it) => it.id));
        let maxZ = currentBoard.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
        const appended = result.items.map((it) => {
          let id = it.id;
          while (existingIds.has(id)) id = uid(it.type);
          existingIds.add(id);
          maxZ += 1;
          return { ...it, id, zIndex: maxZ };
        });
        updateItems((items) => [...items, ...appended], true);
      }
      return { ok: true, issues: result.issues, count: result.items.length };
    },
    [currentBoard.items, pushHistory, replaceCurrentItems, updateItems],
  );

  const repairCurrentBoard = useCallback(() => {
    const result = repairBoardItems(currentBoard.items);
    if (result.changed) {
      replaceCurrentItems(result.items, true);
    }
    return { changed: result.changed, issues: result.issues };
  }, [currentBoard.items, replaceCurrentItems]);

  const value: BoardContextValue = {
    ready,
    boards,
    currentBoard,
    selectedIds,
    tool,
    drawColor,
    panel,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    setPanel,
    setTool,
    setDrawColor: setDrawColorState,
    select,
    clearSelection,
    updateItems,
    moveItems,
    resizeItem,
    updateText,
    toggleTask,
    addItem,
    deleteSelected,
    duplicateSelected,
    createBoard,
    renameBoard,
    switchBoard,
    deleteBoard,
    undo,
    redo,
    resetToSeed,
    appendDrawingPoint,
    exportBoardAsJSONCanvas,
    importJSONCanvas,
    repairCurrentBoard,
    paletteOpen,
    paletteTarget,
    paletteSlots,
    setPaletteOpen,
    setPaletteTarget,
    setPaletteSlot,
    applyPaletteColor,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
