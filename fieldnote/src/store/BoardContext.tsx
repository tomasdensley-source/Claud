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
  restoreBoardsFromBackup,
} from '../lib/storage';
import { clearPersistedAssets, fromPortableUri, readPortableBlob, toPortableUri, writePortableBlob } from '../lib/localFiles';
import { hiddenMindMapIds, migrateBoards, mindMapDescendantIds } from '../lib/migration';
import { conflictSafeBoardName, createPackagePayload, parsePackageJson } from '../lib/packageFormat';
import { hasDependencyPath } from '../lib/graphHelpers';
import { placeMindChild, tidyMindmapTree } from '../lib/placement';
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
  pasteSelection: (center?: { x: number; y: number }) => Promise<void>;
  bringSelectedForward: () => void;
  sendSelectedBackward: () => void;
  lockSelected: (locked: boolean) => void;
  addScientificTemplate: (center: { x: number; y: number }) => void;
  addWorkingFiles: (files: Omit<WorkingFileRecord, 'id' | 'addedAt'>[], recordHistory?: boolean) => void;
  removeWorkingFile: (id: string) => void;
  openUri: (uri?: string) => Promise<void>;
  exportCurrentBoard: () => Promise<void>;
  importBoardJson: (json: string) => Promise<void>;
  restoreFromBackup: () => Promise<void>;
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
    const copy = { ...cloneItem(item), id: idMap.get(item.id) ?? uid(item.type), x: item.x + offset, y: item.y + offset, locked: false };
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

function cloneSelectionAtCenter(items: BoardItem[], center: { x: number; y: number }, offset = 0): BoardItem[] {
  if (items.length === 0) return [];
  const bounds = drawingBoundsForItems(items);
  const dx = center.x - (bounds.minX + bounds.maxX) / 2 + offset;
  const dy = center.y - (bounds.minY + bounds.maxY) / 2 + offset;
  const idMap = new Map(items.map((item) => [item.id, uid(item.type)]));
  return items.map((item) => {
    const copy = { ...cloneItem(item), id: idMap.get(item.id) ?? uid(item.type), x: item.x + dx, y: item.y + dy, locked: false };
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

function hydrateItemUri(item: BoardItem): BoardItem {
  if ((item.type === 'file' || item.type === 'image' || item.type === 'audio' || item.type === 'pdf' || item.type === 'markdown') && item.uri) {
    return { ...item, uri: fromPortableUri(item.uri) ?? item.uri } as BoardItem;
  }
  return item;
}

function hydrateBoardUris(board: Board): Board {
  return { ...board, items: board.items.map(hydrateItemUri) };
}

function hydrateWorkingFileUris(files: WorkingFileRecord[]) {
  return files.map((file) => ({ ...file, uri: fromPortableUri(file.uri) ?? file.uri }));
}

function portableUrisForPackage(board: Board, workingFiles: WorkingFileRecord[]) {
  const byKey = new Map<string, { uri: string; mimeType?: string; size?: number }>();
  board.items.forEach((item) => {
    if ((item.type === 'file' || item.type === 'image' || item.type === 'audio' || item.type === 'pdf' || item.type === 'markdown') && item.uri) {
      const key = toPortableUri(item.uri);
      if (key?.startsWith('fieldnote-files/')) byKey.set(key, {
        uri: item.uri,
        mimeType: item.type === 'image' ? undefined : item.mimeType,
        size: 'size' in item ? item.size : undefined,
      });
    }
  });
  workingFiles.forEach((file) => {
    const key = toPortableUri(file.uri);
    if (key?.startsWith('fieldnote-files/')) byKey.set(key, { uri: file.uri, mimeType: file.mimeType, size: file.size });
  });
  return byKey;
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

function applyFormatPatch(item: BoardItem, patch: Partial<BoardItem>): BoardItem {
  if (item.locked) return item;
  if (item.type === 'text') {
    const next: Extract<BoardItem, { type: 'text' }> = { ...item };
    const rawPatch = patch as Partial<Extract<BoardItem, { type: 'text' }>>;
    if (typeof rawPatch.fontSize === 'number') next.fontSize = rawPatch.fontSize;
    if (rawPatch.fontWeight) next.fontWeight = rawPatch.fontWeight;
    if (rawPatch.textAlign) next.textAlign = rawPatch.textAlign;
    if (typeof rawPatch.italic === 'boolean') next.italic = rawPatch.italic;
    if (rawPatch.color) next.color = rawPatch.color;
    if (rawPatch.backgroundColor) next.backgroundColor = rawPatch.backgroundColor;
    if (rawPatch.role) {
      next.role = rawPatch.role;
      if (rawPatch.role === 'title') {
        next.fontSize = 42;
        next.fontWeight = '700';
      } else if (rawPatch.role === 'note') {
        next.fontSize = 20;
        next.fontWeight = '500';
      } else {
        next.fontSize = 24;
        next.fontWeight = '400';
      }
    }
    return next;
  }
  if (item.type === 'shape') {
    const shapePatch = patch as Partial<Extract<BoardItem, { type: 'shape' }>>;
    return {
      ...item,
      shape: shapePatch.shape ?? item.shape,
      borderColor: shapePatch.borderColor ?? item.borderColor,
      backgroundColor: patch.backgroundColor ?? item.backgroundColor,
    };
  }
  if (item.type === 'region') {
    const regionPatch = patch as Partial<Extract<BoardItem, { type: 'region' }>>;
    return {
      ...item,
      opacity: typeof patch.opacity === 'number' ? patch.opacity : item.opacity,
      pattern: regionPatch.pattern ?? item.pattern,
      backgroundColor: patch.backgroundColor ?? item.backgroundColor,
      editingBackground: typeof regionPatch.editingBackground === 'boolean' ? regionPatch.editingBackground : item.editingBackground,
    };
  }
  if (item.type === 'mindmap') {
    return {
      ...item,
      branchColor: patch.backgroundColor ?? patch.color ?? item.branchColor,
      backgroundColor: patch.backgroundColor ?? item.backgroundColor,
    };
  }
  if (item.type === 'task') {
    const taskPatch = patch as Partial<Extract<BoardItem, { type: 'task' }>>;
    return {
      ...item,
      backgroundColor: patch.backgroundColor ?? item.backgroundColor,
      priority: taskPatch.priority ?? item.priority,
      dueDate: taskPatch.dueDate ?? item.dueDate,
    };
  }
  if (item.type === 'file' || item.type === 'folder' || item.type === 'pdf' || item.type === 'audio' || item.type === 'markdown') {
    return { ...item, backgroundColor: patch.backgroundColor ?? item.backgroundColor } as BoardItem;
  }
  return item;
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
      if (loaded.recoveredFromBackup) showToast('Recovered boards from the last good backup.');
      else if (loaded.recoveredFromCorruptJson) showToast('Recovered from corrupt saved JSON.');
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const flushSave = useCallback(async () => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    setSaving(true);
    try {
      await Promise.all([
        saveBoards(boardsRef.current, currentBoardIdRef.current, workingFilesRef.current),
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
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (textHistoryTimer.current) clearTimeout(textHistoryTimer.current);
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
    if (next) setConnectingFrom(null);
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
            moveIds.includes(it.id) && (!it.locked || !ids.includes(it.id))
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
      const board = boardsRef.current.find((b) => b.id === currentBoardIdRef.current);
      const existing = board?.items.find((item) => item.id === id);
      if (!existing) return;
      const minHeight = existing.type === 'shape' && existing.shape === 'line' ? 8 : 60;
      const nextWidth = Math.max(80, width);
      const nextHeight = Math.max(minHeight, height);
      if (commit && Math.round(existing.width) === Math.round(nextWidth) && Math.round(existing.height) === Math.round(nextHeight)) return;
      updateItems(
        (items) =>
          items.map((it) =>
            it.id === id
              && !it.locked
              ? { ...it, width: nextWidth, height: nextHeight }
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
          it.id === id && !it.locked && (it.type === 'text' || it.type === 'task' || it.type === 'mindmap' || it.type === 'markdown')
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
    const safeName = typeof name === 'string' && name.trim() ? name.trim() : `Board ${boardsRef.current.length + 1}`;
    const board: Board = {
      id: uid('board'),
      name: safeName,
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
    const safeName = name.trim();
    if (!board || !safeName || board.name === safeName) return;
    pushHistory();
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name: safeName, updatedAt: Date.now() } : b)));
    pulse('light');
  }, [pulse, pushHistory]);

  const switchBoard = useCallback((id: string) => {
    setCurrentBoardId(id);
    setSelectedIds([]);
    setPanelState(null);
    setConnectingFrom(null);
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
      const ids = new Set(prev.boards.find((board) => board.id === prev.currentBoardId)?.items.map((item) => item.id) ?? []);
      setSelectedIds((selected) => selected.filter((id) => ids.has(id)));
      setConnectingFrom(null);
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
      const ids = new Set(next.boards.find((board) => board.id === next.currentBoardId)?.items.map((item) => item.id) ?? []);
      setSelectedIds((selected) => selected.filter((id) => ids.has(id)));
      setConnectingFrom(null);
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
        const removedDrawingIds = new Set<string>();
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
              if (paths.length === 0) removedDrawingIds.add(it.id);
              return { ...it, paths };
            })
            .filter((it) => it.type !== 'drawing' || it.paths.length > 0),
          startNewPath,
        );
        if (removedDrawingIds.size) setSelectedIds((ids) => ids.filter((id) => !removedDrawingIds.has(id)));
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
    const siblings = currentBoard.items.filter((it) => it.type === 'mindmap' && it.parentId === parent.id);
    const pos = placeMindChild(parent, siblings);
    addItem({
      type: 'mindmap',
      x: pos.x,
      y: pos.y,
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
    if (!node.parentId) {
      showToast('Root sibling becomes a child to keep one root.');
      addMindChild(node.id);
      return;
    }
    const pos = { x: node.x, y: node.y + Math.max(92, node.height + 24) };
    addItem({
      type: 'mindmap',
      x: pos.x,
      y: pos.y,
      width: node.width,
      height: node.height,
      backgroundColor: colors.paperStrong,
      text: 'Sibling branch',
      parentId: node.parentId,
      collapsed: false,
      branchColor: node.branchColor,
    });
  }, [addItem, addMindChild, currentBoard.items, showToast]);

  const toggleMindCollapse = useCallback((id: string) => {
    const target = currentBoard.items.find((item) => item.id === id && item.type === 'mindmap');
    const willCollapse = target?.type === 'mindmap' ? !target.collapsed : false;
    const descendants = willCollapse ? new Set(mindMapDescendantIds(currentBoard.items, id)) : new Set<string>();
    updateItems((items) =>
      items.map((it) => (it.id === id && it.type === 'mindmap' && !it.locked ? { ...it, collapsed: !it.collapsed } : it)),
    );
    if (descendants.size) setSelectedIds((ids) => ids.filter((selectedId) => !descendants.has(selectedId)));
  }, [currentBoard.items, updateItems]);

  const tidyMindMap = useCallback((id: string) => {
    const root = currentBoard.items.find((it) => it.id === id && it.type === 'mindmap');
    if (!root || root.type !== 'mindmap' || root.locked) return;
    updateItems((items) => tidyMindmapTree(items, id));
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
    updateItems((items) => items.map((it) => (selectedIds.includes(it.id) ? applyFormatPatch(it, patch) : it)));
  }, [selectedIds, updateItems]);

  const copySelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copied = currentBoard.items.filter((it) => selectedIds.includes(it.id)).map((it) => JSON.parse(JSON.stringify(it)) as BoardItem);
    setClipboard(copied);
    void saveClipboard(copied);
    void Clipboard.setStringAsync(JSON.stringify({ schemaVersion: 2, items: copied })).catch(() => undefined);
    showToast(`${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'} copied.`);
  }, [currentBoard.items, selectedIds, showToast]);

  const pasteSelection = useCallback(async (center?: { x: number; y: number }) => {
    if (clipboard.length === 0) {
      const text = await Clipboard.getStringAsync().catch(() => '');
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text) as { items?: unknown; board?: Board; boards?: Board[]; format?: string };
          const items = Array.isArray(parsed.items)
            ? migrateBoards([{ id: 'clipboard', name: 'Clipboard', items: parsed.items, updatedAt: Date.now() }])[0]?.items ?? []
            : parsePackageJson(text).board.items.map(hydrateItemUri);
          if (items.length) {
            addItems(center ? cloneSelectionAtCenter(items, center) : cloneSelection(items, 36));
            showToast('Pasted Fieldnote JSON from clipboard.');
            return;
          }
        } catch {
          // Fall through to the user-facing message below.
        }
      }
      showToast('Copy cards or Fieldnote JSON before pasting.');
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

  const addWorkingFiles = useCallback((files: Omit<WorkingFileRecord, 'id' | 'addedAt'>[], recordHistory = true) => {
    if (files.length === 0) return;
    if (recordHistory) pushHistory();
    setWorkingFiles((prev) => {
      const seen = new Set(prev.map((file) => file.uri));
      const additions = files
        .filter((file) => {
          if (seen.has(file.uri)) return false;
          seen.add(file.uri);
          return true;
        })
        .map((file) => ({ ...file, id: uid('file'), addedAt: Date.now() }));
      return [...additions, ...prev];
    });
    showToast(`${files.length} file${files.length === 1 ? '' : 's'} added to the library.`);
  }, [pushHistory, showToast]);

  const removeWorkingFile = useCallback((id: string) => {
    const file = workingFilesRef.current.find((entry) => entry.id === id);
    pushHistory();
    setWorkingFiles((prev) => prev.filter((entry) => entry.id !== id));
    showToast(file ? 'Working file removed from the library. Undo keeps the copied file available.' : 'Working file removed.');
  }, [pushHistory, showToast]);

  const openUri = useCallback(async (uri?: string) => {
    const resolved = fromPortableUri(uri);
    if (!resolved) {
      showToast('This card does not have a file URI.');
      return;
    }
    try {
      await Linking.openURL(resolved);
    } catch {
      showToast('Could not open this file.');
    }
  }, [showToast]);

  const exportCurrentBoard = useCallback(async () => {
    try {
      const blobs: ReturnType<typeof createPackagePayload>['blobs'] = {};
      const portableFiles = portableUrisForPackage(currentBoard, workingFilesRef.current);
      await Promise.all(Array.from(portableFiles.entries()).map(async ([key, file]) => {
        try {
          const blob = await readPortableBlob(file.uri, file.size);
          blobs[key] = { mimeType: file.mimeType, size: blob.size ?? file.size, base64: blob.base64, skipped: blob.skipped };
        } catch {
          blobs[key] = { mimeType: file.mimeType, size: file.size, skipped: 'unreadable' };
        }
      }));
      const json = JSON.stringify(createPackagePayload(currentBoard, workingFilesRef.current, blobs), null, 2);
      await Share.share({ title: currentBoard.name, message: json });
      showToast(`Fieldnote package ready with ${Object.values(blobs).filter((blob) => blob.base64).length} embedded file blob(s).`);
    } catch {
      showToast('Could not export this board.');
    }
  }, [currentBoard, showToast]);

  const importBoardJson = useCallback(async (json: string) => {
    try {
      const parsed = parsePackageJson(json);
      await Promise.all(Object.entries(parsed.blobs).map(async ([key, blob]) => {
        if (!blob.base64) return;
        await writePortableBlob(key, blob.base64);
      }));
      const board = normalizeImportedBoard([parsed.board]);
      if (!board) throw new Error('No board found');
      board.name = conflictSafeBoardName(board.name, boardsRef.current.map((existing) => existing.name));
      const hydratedBoard = hydrateBoardUris(board);
      pushHistory();
      setBoards((prev) => [...prev, hydratedBoard]);
      setCurrentBoardId(hydratedBoard.id);
      if (parsed.workingFiles.length) {
        const hydratedFiles = hydrateWorkingFileUris(parsed.workingFiles);
        const seen = new Set(workingFilesRef.current.map((file) => file.uri));
        setWorkingFiles((prev) => [
          ...hydratedFiles.filter((file) => !seen.has(file.uri)).map((file) => ({ ...file, id: uid('file'), addedAt: Date.now() })),
          ...prev,
        ]);
      }
      setSelectedIds([]);
      showToast(`Board imported${Object.values(parsed.blobs).some((blob) => blob.base64) ? ' with embedded files restored.' : '.'}`);
    } catch {
      showToast('Could not import that JSON.');
    }
  }, [pushHistory, showToast]);

  const restoreFromBackup = useCallback(async () => {
    const restored = await restoreBoardsFromBackup();
    if (!restored) {
      showToast('No backup snapshot is available yet.');
      return;
    }
    pushHistory();
    setBoards(restored.boards);
    setCurrentBoardId(restored.currentBoardId);
    setSelectedIds([]);
    setConnectingFrom(null);
    showToast('Restored boards from the latest backup.');
  }, [pushHistory, showToast]);

  const value: BoardContextValue = useMemo(() => ({
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
    restoreFromBackup,
    flushSave,
  }), [
    addItem,
    addItems,
    addMindChild,
    addMindSibling,
    addScientificTemplate,
    addWorkingFiles,
    appendDrawingPoint,
    beginConnect,
    boards,
    bringSelectedForward,
    cancelConnect,
    clearSelection,
    clipboard.length,
    commitTextEdit,
    completeConnect,
    connectingFrom?.id,
    connectingFrom?.side,
    copySelection,
    createBoard,
    currentBoard,
    deleteBoard,
    deleteSelected,
    dirty,
    dismissToast,
    drawColor,
    drawMode,
    drawWidth,
    duplicateBoard,
    duplicateSelected,
    exportCurrentBoard,
    flushSave,
    formatSelected,
    future.length,
    hiddenIds,
    history.length,
    importBoardJson,
    lockSelected,
    moveItems,
    openUri,
    panel,
    pasteSelection,
    ready,
    revealMindPath,
    redo,
    removeSelectedDependency,
    removeWorkingFile,
    renameBoard,
    resetToSeed,
    resizeItem,
    restoreFromBackup,
    saving,
    select,
    selectedIds,
    sendSelectedBackward,
    setDrawColor,
    setDrawMode,
    setDrawWidth,
    setPanel,
    setTool,
    showToast,
    switchBoard,
    tidyMindMap,
    toast,
    toggleMindCollapse,
    toggleTask,
    tool,
    undo,
    updateItems,
    updateText,
    visibleItems,
    workingFiles,
  ]);

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}
