import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Board, BoardItem, DraftBoardItem, DrawMode, PanelKind, WorkingFileRecord } from '../types';
import { createMainBoard, createScientificMethodItems, uid } from '../lib/seed';
import {
  clearAllBoards,
  loadClipboard,
  loadBoards,
  loadWorkingFiles,
  saveBoards,
  saveClipboard,
  saveWorkingFiles,
} from '../lib/storage';
import { clearPersistedAssets, deletePersistedAsset, isPersistedFieldnoteFile, toPortableUri } from '../lib/localFiles';
import { hiddenMindMapIds, migrateBoards, mindMapDescendantIds } from '../lib/migration';
import { colors, PALETTE } from '../theme';

type Tool = 'select' | 'draw' | 'multi';
type ConnectorSide = 'left' | 'right' | 'top' | 'bottom';
type ConnectingEndpoint = { id: string; side: ConnectorSide };
type HistorySnapshot = { boards: Board[]; currentBoardId: string; workingFiles: WorkingFileRecord[] };

export interface ToastMessage {
  id: string;
  text: string;
  actionLabel?: string;
  action?: () => void;
}

interface BoardContextValue {
  ready: boolean;
  boards: Board[];
  currentBoard: Board;
  selectedIds: string[];
  visibleItems: BoardItem[];
  hiddenIds: Set<string>;
  tool: Tool;
  drawColor: string;
  drawWidth: number;
  drawMode: DrawMode;
  panel: PanelKind;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  saving: boolean;
  toast: ToastMessage | null;
  connectingFromId: string | null;
  connectingFromSide: ConnectorSide | null;
  workingFiles: WorkingFileRecord[];
  canPaste: boolean;
  setPanel: (p: PanelKind) => void;
  setTool: (t: Tool) => void;
  setDrawColor: (c: string) => void;
  setDrawWidth: (w: number) => void;
  setDrawMode: (m: DrawMode) => void;
  showToast: (text: string, actionLabel?: string, action?: () => void) => void;
  dismissToast: () => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  updateItems: (updater: (items: BoardItem[]) => BoardItem[], pushHistory?: boolean) => void;
  moveItems: (ids: string[], dx: number, dy: number, commit?: boolean) => void;
  resizeItem: (id: string, width: number, height: number, commit?: boolean) => void;
  updateText: (id: string, text: string) => void;
  commitTextEdit: () => void;
  toggleTask: (id: string) => void;
  addItem: (item: DraftBoardItem) => string;
  addItems: (items: DraftBoardItem[]) => string[];
  deleteSelected: () => void;
  duplicateSelected: () => void;
  duplicateBoard: (id: string) => void;
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
  addMindChild: (id: string) => void;
  addMindSibling: (id: string) => void;
  toggleMindCollapse: (id: string) => void;
  tidyMindMap: (id: string) => void;
  beginConnect: (id: string, side?: ConnectorSide) => void;
  completeConnect: (id: string, side?: ConnectorSide) => void;
  cancelConnect: () => void;
  removeSelectedDependency: () => void;
  revealMindPath: (id: string) => void;
  formatSelected: (patch: Partial<BoardItem>) => void;
  copySelection: () => void;
  pasteSelection: (center?: { x: number; y: number }) => void;
  bringSelectedForward: () => void;
  sendSelectedBackward: () => void;
  lockSelected: (locked: boolean) => void;
  addScientificTemplate: (center: { x: number; y: number }) => void;
  addWorkingFiles: (files: Omit<WorkingFileRecord, 'id' | 'addedAt'>[]) => void;
  removeWorkingFile: (id: string) => void;
  openUri: (uri?: string) => Promise<void>;
  exportCurrentBoard: () => Promise<void>;
  importBoardJson: (json: string) => void;
  flushSave: () => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

function cloneBoards(boards: Board[]): Board[] {
  return JSON.parse(JSON.stringify(boards)) as Board[];
}

function cloneItem<T extends BoardItem>(item: T): T {
  return JSON.parse(JSON.stringify(item)) as T;
}

function cloneSelection(items: BoardItem[], offset: number): BoardItem[] {
  const idMap = new Map(items.map((item) => [item.id, uid(item.type)]));
  return items.map((item) => {
    const copy = { ...cloneItem(item), id: idMap.get(item.id) ?? uid(item.type), x: item.x + offset, y: item.y + offset };
    if (copy.type === 'task') copy.dependsOn = copy.dependsOn.map((id) => idMap.get(id) ?? id);
    if (copy.type === 'mindmap' && copy.parentId) copy.parentId = idMap.get(copy.parentId) ?? copy.parentId;
    return copy;
  });
}

function cloneSelectionAtCenter(items: BoardItem[], center: { x: number; y: number }, offset = 0): BoardItem[] {
  if (items.length === 0) return [];
  const bounds = drawingBoundsForItems(items);
  const dx = center.x - (bounds.minX + bounds.maxX) / 2 + offset;
  const dy = center.y - (bounds.minY + bounds.maxY) / 2 + offset;
  const idMap = new Map(items.map((item) => [item.id, uid(item.type)]));
  return items.map((item) => {
    const copy = { ...cloneItem(item), id: idMap.get(item.id) ?? uid(item.type), x: item.x + dx, y: item.y + dy };
    if (copy.type === 'task') {
      copy.dependsOn = copy.dependsOn.map((id) => idMap.get(id) ?? id);
      copy.connectorSides = Object.fromEntries(
        Object.entries(copy.connectorSides ?? {}).map(([id, sides]) => [idMap.get(id) ?? id, sides]),
      );
    }
    if (copy.type === 'mindmap' && copy.parentId) copy.parentId = idMap.get(copy.parentId) ?? copy.parentId;
    return copy;
  });
}

function drawingBoundsForItems(items: BoardItem[]) {
  return items.reduce(
    (bounds, item) => ({
      minX: Math.min(bounds.minX, item.x),
      minY: Math.min(bounds.minY, item.y),
      maxX: Math.max(bounds.maxX, item.x + item.width),
      maxY: Math.max(bounds.maxY, item.y + item.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function drawingBounds(paths: Extract<BoardItem, { type: 'drawing' }>['paths']) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  paths.forEach((path) => {
    path.points.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function distanceToSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function alpha(hex: string, opacity: number) {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function taskDependenciesComplete(task: Extract<BoardItem, { type: 'task' }>, items: BoardItem[]) {
  const done = new Set(items.filter((it) => it.type === 'task' && it.done).map((it) => it.id));
  return task.dependsOn.every((id) => done.has(id));
}

function refreshTaskStates(items: BoardItem[]): BoardItem[] {
  return items.map((item) => {
    if (item.type !== 'task') return item;
    if (item.done) return { ...item, state: 'done' };
    return { ...item, state: taskDependenciesComplete(item, items) ? 'ready' : 'blocked' };
  });
}

function hasDependencyPath(items: BoardItem[], fromId: string, targetId: string): boolean {
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visited.has(id)) return false;
    visited.add(id);
    const task = items.find((item) => item.type === 'task' && item.id === id);
    if (!task || task.type !== 'task') return false;
    if (task.dependsOn.includes(targetId)) return true;
    return task.dependsOn.some((depId) => walk(depId));
  };
  return walk(fromId);
}

function downstreamTaskIds(items: BoardItem[], rootId: string) {
  const downstream = new Set<string>();
  const visit = (taskId: string) => {
    items.forEach((item) => {
      if (item.type === 'task' && item.dependsOn.includes(taskId) && !downstream.has(item.id)) {
        downstream.add(item.id);
        visit(item.id);
      }
    });
  };
  visit(rootId);
  return downstream;
}

function isLocked(items: BoardItem[], id: string) {
  return Boolean(items.find((item) => item.id === id)?.locked);
}

function cloneWorkingFiles(files: WorkingFileRecord[]) {
  return JSON.parse(JSON.stringify(files)) as WorkingFileRecord[];
}

function makeSnapshot(boards: Board[], currentBoardId: string, workingFiles: WorkingFileRecord[]): HistorySnapshot {
  return { boards: cloneBoards(boards), currentBoardId, workingFiles: cloneWorkingFiles(workingFiles) };
}

function normalizeImportedBoard(raw: unknown): Board | null {
  const boards = migrateBoards(raw);
  const board = boards[0];
  if (!board) return null;
  return { ...board, id: uid('board'), name: `${board.name ?? 'Imported board'} import`, updatedAt: Date.now() };
}

function pointNearPath(point: { x: number; y: number }, pathPoints: { x: number; y: number }[], radius: number) {
  if (pathPoints.length === 0) return false;
  if (pathPoints.length === 1) return Math.hypot(point.x - pathPoints[0].x, point.y - pathPoints[0].y) <= radius;
  return pathPoints.some((pathPoint, index) => {
    if (index === 0) return false;
    return distanceToSegment(point, pathPoints[index - 1], pathPoint) <= radius;
  });
}

function withUpdatedBoard(boards: Board[], id: string, updater: (board: Board) => Board) {
  return boards.map((board) => (board.id === id ? updater(board) : board));
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const fallbackBoard = useRef(createMainBoard());
  const [ready, setReady] = useState(false);
  const [boards, setBoards] = useState<Board[]>([fallbackBoard.current]);
  const [currentBoardId, setCurrentBoardId] = useState(fallbackBoard.current.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setToolState] = useState<Tool>('select');
  const [drawColor, setDrawColorState] = useState<string>(colors.ink);
  const [drawWidth, setDrawWidthState] = useState(3);
  const [drawMode, setDrawModeState] = useState<DrawMode>('pen');
  const [panel, setPanelState] = useState<PanelKind>(null);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<ConnectingEndpoint | null>(null);
  const [workingFiles, setWorkingFiles] = useState<WorkingFileRecord[]>([]);
  const [clipboard, setClipboard] = useState<BoardItem[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastQueue = useRef<ToastMessage[]>([]);
  const toastRef = useRef<ToastMessage | null>(null);
  const pendingMoveSnapshot = useRef<HistorySnapshot | null>(null);
  const pendingTextSnapshot = useRef<HistorySnapshot | null>(null);
  const textHistoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didScheduleInitialSave = useRef(false);
  const boardsRef = useRef(boards);
  const currentBoardIdRef = useRef(currentBoardId);
  const workingFilesRef = useRef(workingFiles);
  boardsRef.current = boards;
  currentBoardIdRef.current = currentBoardId;
  workingFilesRef.current = workingFiles;

  const pulse = useCallback((style: 'light' | 'medium' | 'success' = 'light') => {
    if (style === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else {
      void Haptics.impactAsync(
        style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
    }
  }, []);

  const displayToast = useCallback((message: ToastMessage) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastRef.current = message;
    setToast(message);
    toastTimer.current = setTimeout(() => {
      const next = toastQueue.current.shift();
      if (next) displayToast(next);
      else {
        toastRef.current = null;
        setToast(null);
      }
    }, 3600);
  }, []);

  const showToast = useCallback((text: string, actionLabel?: string, action?: () => void) => {
    const message = { id: uid('toast'), text, actionLabel, action };
    if (toastRef.current) toastQueue.current.push(message);
    else displayToast(message);
  }, [displayToast]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const next = toastQueue.current.shift();
    if (next) displayToast(next);
    else {
      toastRef.current = null;
      setToast(null);
    }
  }, [displayToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loaded, files, storedClipboard] = await Promise.all([loadBoards(), loadWorkingFiles(), loadClipboard()]);
      if (cancelled) return;
      setBoards(loaded.boards);
      setCurrentBoardId(loaded.currentBoardId);
      setWorkingFiles(files);
      setClipboard(migrateBoards([{ id: 'clipboard', name: 'Clipboard', items: storedClipboard, updatedAt: Date.now() }])[0]?.items ?? []);
      setReady(true);
      if (loaded.recoveredFromCorruptJson) showToast('Recovered from corrupt saved JSON.');
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const flushSave = useCallback(async () => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      await Promise.all([
        saveBoards(boardsRef.current, currentBoardIdRef.current),
        saveWorkingFiles(workingFilesRef.current),
      ]);
      setDirty(false);
    } catch {
      showToast('Autosave failed. Your latest edits are still on screen.');
    } finally {
      setSaving(false);
    }
  }, [ready, showToast]);

  useEffect(() => {
    if (!ready) return;
    if (!didScheduleInitialSave.current) {
      didScheduleInitialSave.current = true;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDirty(true);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [boards, currentBoardId, workingFiles, ready, flushSave]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') void flushSave();
    });
    return () => sub.remove();
  }, [flushSave]);

  useEffect(() => () => {
    void flushSave();
  }, [flushSave]);

  const currentBoard = useMemo(
    () => boards.find((b) => b.id === currentBoardId) ?? boards[0] ?? fallbackBoard.current,
    [boards, currentBoardId],
  );

  const hiddenIds = useMemo(() => hiddenMindMapIds(currentBoard.items), [currentBoard.items]);
  const visibleItems = useMemo(
    () => currentBoard.items.filter((item) => !hiddenIds.has(item.id)),
    [currentBoard.items, hiddenIds],
  );

  const pushHistory = useCallback((snapshot = makeSnapshot(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current)) => {
    setHistory((h) => [...h.slice(-40), snapshot]);
    setFuture([]);
  }, []);

  const replaceCurrentItems = useCallback(
    (items: BoardItem[], recordHistory: boolean) => {
      if (!currentBoardIdRef.current) return;
      if (recordHistory) pushHistory();
      setBoards((prev) =>
        withUpdatedBoard(prev, currentBoardIdRef.current, (board) => ({
          ...board,
          items: refreshTaskStates(items),
          updatedAt: Date.now(),
        })),
      );
    },
    [pushHistory],
  );

  const updateItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[], recordHistory = true) => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      if (!board) return;
      replaceCurrentItems(updater(board.items), recordHistory);
    },
    [replaceCurrentItems],
  );

  const select = useCallback((ids: string[], additive = false) => {
    setSelectedIds((prev) => {
      return additive
        ? (() => {
            const set = new Set(prev);
            ids.forEach((id) => (set.has(id) ? set.delete(id) : set.add(id)));
            return Array.from(set);
          })()
        : ids;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setConnectingFrom(null);
  }, []);

  const setPanel = useCallback((next: PanelKind) => {
    setPanelState(next);
  }, []);

  const setTool = useCallback((next: Tool) => {
    setToolState(next);
    setPanelState(null);
    if (next === 'draw') clearSelection();
  }, [clearSelection]);

  const setDrawColor = useCallback((next: string) => {
    setDrawColorState(next);
    pulse('light');
  }, [pulse]);

  const setDrawWidth = useCallback((next: number) => {
    setDrawWidthState(next);
    pulse('light');
  }, [pulse]);

  const setDrawMode = useCallback((next: DrawMode) => {
    setDrawModeState(next);
    pulse('light');
  }, [pulse]);

  const expandMoveIds = useCallback((ids: string[]) => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    if (!board) return ids;
    const set = new Set(ids);
    ids.forEach((id) => mindMapDescendantIds(board.items, id).forEach((childId) => set.add(childId)));
    return Array.from(set);
  }, []);

  const moveItems = useCallback(
    (ids: string[], dx: number, dy: number, commit = false) => {
      if (ids.length === 0) return;
      const moveIds = expandMoveIds(ids);
      if (!commit && !pendingMoveSnapshot.current) {
        pendingMoveSnapshot.current = makeSnapshot(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current);
      }
      if (commit && pendingMoveSnapshot.current) {
        pushHistory(pendingMoveSnapshot.current);
        pendingMoveSnapshot.current = null;
      }
      updateItems(
        (items) =>
          items.map((it) =>
            moveIds.includes(it.id) && !it.locked
              ? { ...it, x: it.x + dx, y: it.y + dy }
              : it,
          ),
        commit && !pendingMoveSnapshot.current && (dx !== 0 || dy !== 0),
      );
      if (commit) pulse('medium');
    },
    [expandMoveIds, pulse, pushHistory, updateItems],
  );

  const resizeItem = useCallback(
    (id: string, width: number, height: number, commit = false) => {
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id
              && !it.locked
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
      if (!pendingTextSnapshot.current) {
        pendingTextSnapshot.current = makeSnapshot(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current);
      }
      if (textHistoryTimer.current) clearTimeout(textHistoryTimer.current);
      textHistoryTimer.current = setTimeout(() => {
        if (pendingTextSnapshot.current) pushHistory(pendingTextSnapshot.current);
        pendingTextSnapshot.current = null;
        textHistoryTimer.current = null;
      }, 650);
      updateItems((items) =>
        items.map((it) =>
          it.id === id && !it.locked && (it.type === 'text' || it.type === 'task' || it.type === 'mindmap')
            ? { ...it, text }
            : it,
        ),
        false,
      );
    },
    [pushHistory, updateItems],
  );

  const commitTextEdit = useCallback(() => {
    if (textHistoryTimer.current) clearTimeout(textHistoryTimer.current);
    if (pendingTextSnapshot.current) pushHistory(pendingTextSnapshot.current);
    pendingTextSnapshot.current = null;
    textHistoryTimer.current = null;
  }, [pushHistory]);

  const toggleTask = useCallback(
    (id: string) => {
      let blocked = false;
      let locked = false;
      updateItems((items) => {
        const target = items.find((it) => it.id === id && it.type === 'task');
        if (!target || target.type !== 'task') return items;
        if (target.locked) {
          locked = true;
          return items;
        }
        if (!target.done && !taskDependenciesComplete(target, items)) {
          blocked = true;
          return refreshTaskStates(items);
        }
        const downstream = target.done ? downstreamTaskIds(items, id) : new Set<string>();
        return items.map((it) => {
          if (it.type !== 'task') return it;
          if (it.id === id) return { ...it, done: !target.done };
          if (target.done && downstream.has(it.id)) return { ...it, done: false };
          return it;
        });
      });
      if (locked) showToast('Unlock this task before changing it.');
      else if (blocked) showToast('Task is blocked until its dependencies are done.');
      else pulse('success');
    },
    [pulse, showToast, updateItems],
  );

  const addItems = useCallback(
    (partials: DraftBoardItem[]) => {
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current) ?? currentBoard;
      let z = board.items.reduce((m, it) => Math.max(m, it.zIndex), 0);
      const ids: string[] = [];
      const newItems = partials.map((partial) => {
        const id = partial.id || uid(partial.type);
        ids.push(id);
        return { ...partial, id, zIndex: partial.zIndex ?? ++z } as BoardItem;
      });
      updateItems((items) => [...items, ...newItems]);
      setSelectedIds(ids);
      pulse('success');
      return ids;
    },
    [currentBoard, pulse, updateItems],
  );

  const addItem = useCallback((partial: DraftBoardItem) => addItems([partial])[0], [addItems]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const deleteIds = new Set<string>();
    let lockedSubtree = false;
    selectedIds.forEach((id) => {
      const item = currentBoard.items.find((it) => it.id === id);
      if (!item || item.locked) return;
      const descendants = item.type === 'mindmap' ? mindMapDescendantIds(currentBoard.items, id) : [];
      if (descendants.some((childId) => isLocked(currentBoard.items, childId))) {
        lockedSubtree = true;
        return;
      }
      deleteIds.add(id);
      descendants.forEach((childId) => deleteIds.add(childId));
    });
    if (lockedSubtree) {
      showToast('Unlock the whole mind-map branch before deleting it.');
      return;
    }
    if (deleteIds.size === 0) {
      showToast('Unlock selected items before deleting.');
      return;
    }
    const deleted = currentBoard.items.filter((it) => deleteIds.has(it.id));
    const remainingFileUris = new Set<string>();
    currentBoard.items.forEach((it) => {
      if (deleteIds.has(it.id)) return;
      if ((it.type === 'file' || it.type === 'image' || it.type === 'audio' || it.type === 'pdf' || it.type === 'markdown') && it.uri) {
        remainingFileUris.add(it.uri);
      }
    });
    workingFilesRef.current.forEach((file) => remainingFileUris.add(file.uri));
    deleted.forEach((it) => {
      if ((it.type === 'file' || it.type === 'image' || it.type === 'audio' || it.type === 'pdf' || it.type === 'markdown') && it.uri && !remainingFileUris.has(it.uri)) {
        void deletePersistedAsset(it.uri);
      }
    });
    updateItems((items) => {
      const kept = items.filter((it) => !deleteIds.has(it.id));
      return kept.map((it) => {
        if (it.type !== 'task') return it;
        const dependsOn = it.dependsOn.filter((depId) => !deleteIds.has(depId));
        const connectorSides = Object.fromEntries(
          Object.entries(it.connectorSides ?? {}).filter(([depId]) => !deleteIds.has(depId)),
        );
        return { ...it, dependsOn, connectorSides };
      });
    });
    setSelectedIds([]);
    showToast(
      `${deleted.length} item${deleted.length === 1 ? '' : 's'} deleted.`,
      'Undo',
      () => {
        updateItems((items) => [...items, ...deleted], true);
        setSelectedIds(deleted.map((it) => it.id));
      },
    );
    pulse('medium');
  }, [currentBoard.items, pulse, selectedIds, showToast, updateItems]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (currentBoard.items.some((it) => selectedIds.includes(it.id) && it.locked)) {
      showToast('Duplicating locked items creates unlocked copies.');
    }
    const copies = cloneSelection(currentBoard.items.filter((it) => selectedIds.includes(it.id)), 28);
    addItems(copies);
  }, [addItems, currentBoard.items, selectedIds, showToast]);

  const duplicateBoard = useCallback((id: string) => {
    const board = boardsRef.current.find((b) => b.id === id);
    if (!board) return;
    pushHistory();
    const copy = {
      ...JSON.parse(JSON.stringify(board)),
      id: uid('board'),
      name: `${board.name} copy`,
      updatedAt: Date.now(),
    } as Board;
    setBoards((prev) => [...prev, copy]);
    setCurrentBoardId(copy.id);
    setSelectedIds([]);
    pulse('success');
  }, [pulse, pushHistory]);

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
    pulse('success');
  }, [pulse, pushHistory]);

  const renameBoard = useCallback((id: string, name: string) => {
    const board = boardsRef.current.find((b) => b.id === id);
    if (!board || board.name === name) return;
    pushHistory();
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b)));
    pulse('light');
  }, [pulse, pushHistory]);

  const switchBoard = useCallback((id: string) => {
    setCurrentBoardId(id);
    setSelectedIds([]);
    setPanelState(null);
  }, []);

  const deleteBoard = useCallback(
    (id: string) => {
      if (boardsRef.current.length <= 1) return;
      pushHistory();
      const next = boardsRef.current.filter((b) => b.id !== id);
      const safeNext = next.length ? next : [fallbackBoard.current];
      setBoards(safeNext);
      if (id === currentBoardIdRef.current) setCurrentBoardId(safeNext[0].id);
      setSelectedIds([]);
      pulse('medium');
    },
    [pulse, pushHistory],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [makeSnapshot(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current), ...f].slice(0, 40));
      setBoards(prev.boards);
      setCurrentBoardId(prev.currentBoardId);
      setWorkingFiles(prev.workingFiles);
      showToast('Undo complete.');
      return h.slice(0, -1);
    });
  }, [showToast]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setHistory((h) => [...h, makeSnapshot(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current)].slice(-40));
      setBoards(next.boards);
      setCurrentBoardId(next.currentBoardId);
      setWorkingFiles(next.workingFiles);
      showToast('Redo complete.');
      return rest;
    });
  }, [showToast]);

  const resetToSeed = useCallback(async () => {
    await clearAllBoards();
    await clearPersistedAssets();
    const main = createMainBoard();
    setBoards([main]);
    setCurrentBoardId(main.id);
    setSelectedIds([]);
    setToolState('select');
    setPanelState(null);
    setHistory([]);
    setFuture([]);
    setWorkingFiles([]);
    showToast('Demo board restored and copied files cleared.');
  }, [showToast]);

  const appendDrawingPoint = useCallback(
    (itemId: string | null, point: { x: number; y: number }, startNewPath: boolean) => {
      if (drawMode === 'eraser') {
        const radius = Math.max(8, drawWidth * 2.2);
        const eraserPoints = [{ x: point.x, y: point.y }];
        updateItems((items) =>
          items
            .map((it) => {
              if (it.type !== 'drawing') return it;
              const paths = it.paths
                .filter((path) => path.mode !== 'eraser')
                .map((path) => ({
                  ...path,
                  points: path.points.filter((local) => {
                    const worldPoint = { x: it.x + local.x, y: it.y + local.y };
                    return !pointNearPath(worldPoint, eraserPoints, radius);
                  }),
                }))
                .filter((path) => path.points.length > 1);
              return { ...it, paths };
            })
            .filter((it) => it.type !== 'drawing' || it.paths.length > 0),
          startNewPath,
        );
        return 'eraser';
      }
      const pathColor =
        drawMode === 'highlighter'
          ? alpha(drawColor, 0.36)
          : drawColor;
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
          paths: [{ color: pathColor, width: drawWidth, mode: drawMode, points: [{ x: 40, y: 40 }] }],
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
            paths.push({ color: pathColor, width: drawWidth, mode: drawMode, points: [local] });
          } else {
            const last = { ...paths[paths.length - 1] };
            last.points = [...last.points, local];
            paths[paths.length - 1] = last;
          }
          const bounds = drawingBounds(paths);
          if (!bounds) return { ...it, paths };
          const pad = 40;
          const desiredMinX = bounds.minX - pad;
          const desiredMinY = bounds.minY - pad;
          const desiredMaxX = bounds.maxX + pad;
          const desiredMaxY = bounds.maxY + pad;
          const shiftedPaths = paths.map((path) => ({
            ...path,
            points: path.points.map((pathPoint) => ({
              x: pathPoint.x - desiredMinX,
              y: pathPoint.y - desiredMinY,
            })),
          }));
          return {
            ...it,
            x: it.x + desiredMinX,
            y: it.y + desiredMinY,
            paths: shiftedPaths,
            width: Math.max(80, desiredMaxX - desiredMinX),
            height: Math.max(80, desiredMaxY - desiredMinY),
          };
        }),
        false,
      );
      return targetId;
    },
    [currentBoard.items, drawColor, drawMode, drawWidth, updateItems],
  );

  const addMindChild = useCallback((id: string) => {
    const parent = currentBoard.items.find((it) => it.id === id && it.type === 'mindmap');
    if (!parent || parent.type !== 'mindmap' || parent.locked) return;
    addItem({
      type: 'mindmap',
      x: parent.x + 280,
      y: parent.y + 90,
      width: 220,
      height: 70,
      backgroundColor: colors.paperStrong,
      text: 'New branch',
      parentId: parent.id,
      collapsed: false,
      branchColor: PALETTE[currentBoard.items.length % PALETTE.length],
    });
  }, [addItem, currentBoard.items]);

  const addMindSibling = useCallback((id: string) => {
    const node = currentBoard.items.find((it) => it.id === id && it.type === 'mindmap');
    if (!node || node.type !== 'mindmap' || node.locked) return;
    addItem({
      type: 'mindmap',
      x: node.x,
      y: node.y + 92,
      width: node.width,
      height: node.height,
      backgroundColor: colors.paperStrong,
      text: 'Sibling branch',
      parentId: node.parentId,
      collapsed: false,
      branchColor: node.branchColor,
    });
  }, [addItem, currentBoard.items]);

  const toggleMindCollapse = useCallback((id: string) => {
    updateItems((items) =>
      items.map((it) => (it.id === id && it.type === 'mindmap' && !it.locked ? { ...it, collapsed: !it.collapsed } : it)),
    );
  }, [updateItems]);

  const tidyMindMap = useCallback((id: string) => {
    const root = currentBoard.items.find((it) => it.id === id && it.type === 'mindmap');
    if (!root || root.type !== 'mindmap' || root.locked) return;
    updateItems((items) => {
      const children = items.filter((it) => it.type === 'mindmap' && it.parentId === id);
      return items.map((it) => {
        const index = children.findIndex((child) => child.id === it.id);
        if (index < 0) return it;
        return {
          ...it,
          x: root.x + 330,
          y: root.y + (index - (children.length - 1) / 2) * 96,
        };
      });
    });
    showToast('Mind map tidied.');
  }, [currentBoard.items, showToast, updateItems]);

  const beginConnect = useCallback((id: string, side: ConnectorSide = 'right') => {
    const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
    const item = board?.items.find((it) => it.id === id);
    if (!item || item.type !== 'task' || item.locked) {
      showToast('Only unlocked task cards can start dependencies.');
      return;
    }
    setConnectingFrom({ id, side });
    showToast('Tap another task connector to add a dependency.');
    pulse('light');
  }, [pulse, showToast]);

  const completeConnect = useCallback((id: string, side: ConnectorSide = 'left') => {
    const from = connectingFrom;
    if (!from) {
      beginConnect(id, side);
      return;
    }
    if (from.id === id) {
      setConnectingFrom(null);
      return;
    }
    let message = 'Dependency connected.';
    updateItems((items) => {
      const fromItem = items.find((it) => it.id === from.id);
      const to = items.find((it) => it.id === id);
      if (!fromItem || !to || fromItem.type !== 'task' || to.type !== 'task') {
        message = 'Dependencies can only connect tasks.';
        return items;
      }
      if (fromItem.locked || to.locked) {
        message = 'Unlock tasks before connecting dependencies.';
        return items;
      }
      if (hasDependencyPath(items, from.id, id)) {
        message = 'That dependency would create a cycle.';
        return items;
      }
      return items.map((it) =>
        it.id === id && it.type === 'task' && !it.dependsOn.includes(from.id)
          ? {
              ...it,
              dependsOn: [...it.dependsOn, from.id],
              connectorSides: {
                ...(it.connectorSides ?? {}),
                [from.id]: { fromSide: from.side, toSide: side },
              },
            }
          : it,
      );
    });
    setConnectingFrom(null);
    showToast(message);
    pulse(message.includes('connected') ? 'success' : 'medium');
  }, [beginConnect, connectingFrom, pulse, showToast, updateItems]);

  const cancelConnect = useCallback(() => {
    setConnectingFrom(null);
    showToast('Dependency connection cancelled.');
  }, [showToast]);

  const removeSelectedDependency = useCallback(() => {
    const taskId = selectedIds[0];
    if (!taskId) return;
    let removed = false;
    updateItems((items) =>
      items.map((it) => {
        if (it.id !== taskId || it.type !== 'task' || it.dependsOn.length === 0 || it.locked) return it;
        const depId = it.dependsOn[it.dependsOn.length - 1];
        const connectorSides = { ...(it.connectorSides ?? {}) };
        delete connectorSides[depId];
        removed = true;
        return { ...it, dependsOn: it.dependsOn.slice(0, -1), connectorSides };
      }),
    );
    showToast(removed ? 'Removed the most recent dependency.' : 'Select an unlocked task with dependencies.');
  }, [selectedIds, showToast, updateItems]);

  const revealMindPath = useCallback((id: string) => {
    updateItems((items) => {
      const byId = new Map(items.map((item) => [item.id, item]));
      const ancestors = new Set<string>();
      let cursor = byId.get(id);
      while (cursor?.type === 'mindmap' && cursor.parentId) {
        ancestors.add(cursor.parentId);
        cursor = byId.get(cursor.parentId);
      }
      if (ancestors.size === 0) return items;
      return items.map((it) => (it.type === 'mindmap' && ancestors.has(it.id) ? { ...it, collapsed: false } : it));
    });
  }, [updateItems]);

  const formatSelected = useCallback((patch: Partial<BoardItem>) => {
    updateItems((items) => items.map((it) => (selectedIds.includes(it.id) && !it.locked ? { ...it, ...patch } as BoardItem : it)));
  }, [selectedIds, updateItems]);

  const copySelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copied = currentBoard.items.filter((it) => selectedIds.includes(it.id)).map((it) => JSON.parse(JSON.stringify(it)) as BoardItem);
    setClipboard(copied);
    void saveClipboard(copied);
    void Clipboard.setStringAsync(JSON.stringify({ schemaVersion: 2, items: copied })).catch(() => undefined);
    showToast(`${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'} copied.`);
  }, [currentBoard.items, selectedIds, showToast]);

  const pasteSelection = useCallback((center?: { x: number; y: number }) => {
    if (clipboard.length === 0) {
      showToast('Copy cards before pasting.');
      return;
    }
    addItems(center ? cloneSelectionAtCenter(clipboard, center) : cloneSelection(clipboard, 36));
    showToast('Pasted selection into view.');
  }, [addItems, clipboard, showToast]);

  const bringSelectedForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => {
      const maxZ = items.reduce((max, item) => Math.max(max, item.zIndex), 0);
      let nextZ = maxZ;
      return items.map((it) => (selectedIds.includes(it.id) && !it.locked ? { ...it, zIndex: ++nextZ } : it));
    });
    showToast('Selection brought forward.');
  }, [selectedIds, showToast, updateItems]);

  const sendSelectedBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateItems((items) => {
      let nextZ = 0;
      const selected = items.filter((it) => selectedIds.includes(it.id) && !it.locked).map((it) => ({ ...it, zIndex: ++nextZ }));
      const selectedById = new Map(selected.map((it) => [it.id, it]));
      return items.map((it) => selectedById.get(it.id) ?? { ...it, zIndex: it.zIndex + selected.length });
    });
    showToast('Selection sent backward.');
  }, [selectedIds, showToast, updateItems]);

  const lockSelected = useCallback((locked: boolean) => {
    updateItems((items) => items.map((it) => (selectedIds.includes(it.id) ? { ...it, locked } : it)));
    showToast(locked ? 'Selection locked.' : 'Selection unlocked.');
  }, [selectedIds, showToast, updateItems]);

  const addScientificTemplate = useCallback((center: { x: number; y: number }) => {
    addItems(createScientificMethodItems(center.x, center.y));
  }, [addItems]);

  const addWorkingFiles = useCallback((files: Omit<WorkingFileRecord, 'id' | 'addedAt'>[]) => {
    if (files.length === 0) return;
    pushHistory();
    setWorkingFiles((prev) => [
      ...files.map((file) => ({ ...file, id: uid('file'), addedAt: Date.now() })),
      ...prev,
    ]);
    showToast(`${files.length} file${files.length === 1 ? '' : 's'} added to the library.`);
  }, [pushHistory, showToast]);

  const removeWorkingFile = useCallback((id: string) => {
    const file = workingFilesRef.current.find((entry) => entry.id === id);
    pushHistory();
    setWorkingFiles((prev) => prev.filter((entry) => entry.id !== id));
    if (file) {
      const stillUsed = boardsRef.current.some((board) =>
        board.items.some((item) =>
          (item.type === 'file' || item.type === 'image' || item.type === 'audio' || item.type === 'pdf' || item.type === 'markdown') && item.uri === file.uri,
        ),
      );
      if (!stillUsed) void deletePersistedAsset(file.uri);
    }
    showToast('Working file removed from the library.');
  }, [pushHistory, showToast]);

  const openUri = useCallback(async (uri?: string) => {
    if (!uri) {
      showToast('This card does not have a file URI.');
      return;
    }
    try {
      await Linking.openURL(uri);
    } catch {
      showToast('Could not open this file.');
    }
  }, [showToast]);

  const exportCurrentBoard = useCallback(async () => {
    try {
      const portableItem = (item: BoardItem): BoardItem => {
        if ((item.type === 'file' || item.type === 'image' || item.type === 'audio' || item.type === 'pdf' || item.type === 'markdown') && item.uri) {
          return { ...item, uri: toPortableUri(item.uri) ?? item.uri } as BoardItem;
        }
        return item;
      };
      const json = JSON.stringify({
        schemaVersion: 3,
        board: { ...currentBoard, items: currentBoard.items.map(portableItem) },
        workingFiles: workingFilesRef.current.map((file) => ({
          ...file,
          uri: toPortableUri(file.uri) ?? file.uri,
          embedded: false,
          localCopy: isPersistedFieldnoteFile(file.uri),
        })),
        assetBase: 'fieldnote-files/',
      }, null, 2);
      await Share.share({ title: currentBoard.name, message: json });
      showToast('Board JSON ready to share.');
    } catch {
      showToast('Could not export this board.');
    }
  }, [currentBoard, showToast]);

  const importBoardJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as { board?: Board; boards?: Board[] };
      const board = normalizeImportedBoard(parsed.board ? [parsed.board] : parsed);
      if (!board) throw new Error('No board found');
      pushHistory();
      setBoards((prev) => [...prev, board]);
      setCurrentBoardId(board.id);
      setSelectedIds([]);
      showToast('Board imported.');
    } catch {
      showToast('Could not import that JSON.');
    }
  }, [pushHistory, showToast]);

  const value: BoardContextValue = {
    ready,
    boards,
    currentBoard,
    selectedIds,
    visibleItems,
    hiddenIds,
    tool,
    drawColor,
    drawWidth,
    drawMode,
    panel,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    dirty,
    saving,
    toast,
    connectingFromId: connectingFrom?.id ?? null,
    connectingFromSide: connectingFrom?.side ?? null,
    workingFiles,
    canPaste: clipboard.length > 0,
    setPanel,
    setTool,
    setDrawColor,
    setDrawWidth,
    setDrawMode,
    showToast,
    dismissToast,
    select,
    clearSelection,
    updateItems,
    moveItems,
    resizeItem,
    updateText,
    commitTextEdit,
    toggleTask,
    addItem,
    addItems,
    deleteSelected,
    duplicateSelected,
    duplicateBoard,
    createBoard,
    renameBoard,
    switchBoard,
    deleteBoard,
    undo,
    redo,
    resetToSeed,
    appendDrawingPoint,
    addMindChild,
    addMindSibling,
    toggleMindCollapse,
    tidyMindMap,
    beginConnect,
    completeConnect,
    cancelConnect,
    removeSelectedDependency,
    revealMindPath,
    formatSelected,
    copySelection,
    pasteSelection,
    bringSelectedForward,
    sendSelectedBackward,
    lockSelected,
    addScientificTemplate,
    addWorkingFiles,
    removeWorkingFile,
    openUri,
    exportCurrentBoard,
    importBoardJson,
    flushSave,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
