import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board, BoardItem, ItemType, Landmark } from '../types';
import { createMainBoard } from './seed';
import { sqliteLoadBoards, sqliteSaveBoards } from './sqliteStore';

export type { Landmark };

const STORAGE_KEY = 'fieldnote.boards.v1';
const CURRENT_KEY = 'fieldnote.currentBoardId.v1';
const LANDMARKS_KEY = 'fieldnote.landmarks.v1';
const ARCHIVED_KEY = 'fieldnote.archivedBoards.v1';

const ALLOWED_TYPES = new Set<ItemType>([
  'text',
  'image',
  'task',
  'mindmap',
  'region',
  'shape',
  'drawing',
  'file',
  'folder',
  'connector',
]);

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeItem(raw: unknown, index: number): BoardItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const type = item.type;
  if (typeof type !== 'string' || !ALLOWED_TYPES.has(type as ItemType)) {
    // Convert unknown/advanced item types into a safe text card so launch never crashes.
    const label =
      asString(item.text) ||
      asString(item.name) ||
      asString(item.label) ||
      asString(type, 'Note');
    return {
      id: asString(item.id, `recovered-${index}`),
      type: 'text',
      x: asNumber(item.x, 40 + (index % 8) * 24),
      y: asNumber(item.y, 40 + Math.floor(index / 8) * 24),
      width: Math.max(120, asNumber(item.width, 220)),
      height: Math.max(60, asNumber(item.height, 90)),
      zIndex: asNumber(item.zIndex, index),
      text: label || 'Recovered note',
      fontSize: 16,
      role: 'note',
      color: '#1f2937',
      backgroundColor: '#fff7ed',
    };
  }

  const base = {
    id: asString(item.id, `item-${index}`),
    x: asNumber(item.x, 40),
    y: asNumber(item.y, 40),
    width: Math.max(40, asNumber(item.width, 160)),
    height: Math.max(40, asNumber(item.height, 80)),
    zIndex: asNumber(item.zIndex, index),
    backgroundColor: typeof item.backgroundColor === 'string' ? item.backgroundColor : undefined,
    color: typeof item.color === 'string' ? item.color : undefined,
    parentId: typeof item.parentId === 'string' ? item.parentId : item.parentId === null ? null : undefined,
    locked: Boolean(item.locked),
    opacity:
      typeof item.opacity === 'number' && Number.isFinite(item.opacity)
        ? Math.min(1, Math.max(0.05, item.opacity))
        : undefined,
  };

  switch (type as ItemType) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: asString(item.text, 'Note'),
        fontSize: Math.max(10, asNumber(item.fontSize, 16)),
        role: (item.role as 'title' | 'body' | 'note') || 'note',
        fontWeight: (item.fontWeight as '400' | '500' | '600' | '700') || '400',
        markdown: Boolean(item.markdown),
      };
    case 'image':
      return {
        ...base,
        type: 'image',
        uri: asString(item.uri),
        alt: asString(item.alt, 'Image'),
        assetKey:
          item.assetKey === 'pottery' || item.assetKey === 'wildflower'
            ? item.assetKey
            : undefined,
      };
    case 'task':
      return {
        ...base,
        type: 'task',
        text: asString(item.text, 'Task'),
        done: Boolean(item.done),
        dependsOn: Array.isArray(item.dependsOn)
          ? item.dependsOn.filter((id): id is string => typeof id === 'string')
          : undefined,
        markdown: Boolean(item.markdown),
      };
    case 'mindmap':
      return {
        ...base,
        type: 'mindmap',
        text: asString(item.text, 'Idea'),
        children: Array.isArray(item.children)
          ? item.children.filter((c): c is string => typeof c === 'string')
          : [],
        collapsed: Boolean(item.collapsed),
        branchColor: typeof item.branchColor === 'string' ? item.branchColor : undefined,
      };
    case 'region':
      return {
        ...base,
        type: 'region',
        label: asString(item.label, 'Region'),
        frameColor: typeof item.frameColor === 'string' ? item.frameColor : undefined,
      };
    case 'shape': {
      const shape = item.shape === 'ellipse' || item.shape === 'line' ? item.shape : 'rect';
      return { ...base, type: 'shape', shape };
    }
    case 'drawing': {
      const paths = Array.isArray(item.paths)
        ? item.paths
            .map((path) => {
              if (!path || typeof path !== 'object') return null;
              const p = path as Record<string, unknown>;
              const points = Array.isArray(p.points)
                ? p.points
                    .map((pt) => {
                      if (!pt || typeof pt !== 'object') return null;
                      const point = pt as Record<string, unknown>;
                      return { x: asNumber(point.x, 0), y: asNumber(point.y, 0) };
                    })
                    .filter((pt): pt is { x: number; y: number } => pt !== null)
                : [];
              return {
                color: asString(p.color, '#1f2937'),
                width: Math.max(1, asNumber(p.width, 3)),
                points,
              };
            })
            .filter((path): path is { color: string; width: number; points: { x: number; y: number }[] } => path !== null)
        : [];
      return { ...base, type: 'drawing', paths };
    }
    case 'file':
      return {
        ...base,
        type: 'file',
        name: asString(item.name, 'File'),
        uri: asString(item.uri),
        mimeType: typeof item.mimeType === 'string' ? item.mimeType : undefined,
        pageCount:
          typeof item.pageCount === 'number' && Number.isFinite(item.pageCount)
            ? Math.max(1, Math.round(item.pageCount))
            : undefined,
        sizeBytes:
          typeof item.sizeBytes === 'number' && Number.isFinite(item.sizeBytes)
            ? Math.max(0, item.sizeBytes)
            : undefined,
      };
    case 'folder':
      return {
        ...base,
        type: 'folder',
        name: asString(item.name, 'Folder'),
        fileCount: Math.max(0, asNumber(item.fileCount, 0)),
      };
    case 'connector': {
      const side = (v: unknown): 'left' | 'right' | 'top' | 'bottom' | 'center' | undefined =>
        v === 'left' || v === 'right' || v === 'top' || v === 'bottom' || v === 'center'
          ? v
          : undefined;
      return {
        ...base,
        type: 'connector',
        fromId: asString(item.fromId),
        toId: asString(item.toId),
        fromSide: side(item.fromSide),
        toSide: side(item.toSide),
        thickness: Math.max(1, asNumber(item.thickness, 2)),
        glowing: Boolean(item.glowing),
      };
    }
    default:
      return null;
  }
}

function sanitizeBoard(raw: unknown, index: number): Board | null {
  if (!raw || typeof raw !== 'object') return null;
  const board = raw as Record<string, unknown>;
  const items = Array.isArray(board.items)
    ? board.items
        .map((item, itemIndex) => sanitizeItem(item, itemIndex))
        .filter((item): item is BoardItem => item !== null)
    : [];
  return {
    id: asString(board.id, `board-${index}`),
    name: asString(board.name, index === 0 ? 'Main board' : `Board ${index + 1}`),
    items,
    updatedAt: asNumber(board.updatedAt, Date.now()),
    archived: Boolean(board.archived),
    thumbnailUri: typeof board.thumbnailUri === 'string' ? board.thumbnailUri : undefined,
  };
}

async function loadFromAsync(): Promise<{ boards: Board[]; currentBoardId: string }> {
  const [raw, current] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(CURRENT_KEY),
  ]);
  if (!raw) {
    const main = createMainBoard();
    return { boards: [main], currentBoardId: main.id };
  }
  const parsed = JSON.parse(raw) as unknown;
  const boards = Array.isArray(parsed)
    ? parsed
        .map((board, index) => sanitizeBoard(board, index))
        .filter((board): board is Board => board !== null)
        .filter((b) => !b.archived)
    : [];
  if (boards.length === 0) {
    const main = createMainBoard();
    return { boards: [main], currentBoardId: main.id };
  }
  const currentBoardId =
    current && boards.some((b) => b.id === current) ? current : boards[0].id;
  return { boards, currentBoardId };
}

export async function loadBoards(): Promise<{ boards: Board[]; currentBoardId: string }> {
  try {
    const fromSql = await sqliteLoadBoards();
    if (fromSql && fromSql.boards.length > 0) {
      const boards = fromSql.boards
        .map((b, i) => sanitizeBoard(b, i))
        .filter((b): b is Board => b !== null);
      if (boards.length > 0) {
        return {
          boards,
          currentBoardId: boards.some((b) => b.id === fromSql.currentBoardId)
            ? fromSql.currentBoardId
            : boards[0].id,
        };
      }
    }
    const fromAsync = await loadFromAsync();
    // Migrate AsyncStorage → SQLite when possible.
    void sqliteSaveBoards(fromAsync.boards, fromAsync.currentBoardId);
    return fromAsync;
  } catch {
    const main = createMainBoard();
    return { boards: [main], currentBoardId: main.id };
  }
}

export async function saveBoards(boards: Board[], currentBoardId: string): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(boards)),
      AsyncStorage.setItem(CURRENT_KEY, currentBoardId),
      sqliteSaveBoards(boards, currentBoardId),
    ]);
  } catch (error) {
    console.warn('Fieldnote failed to save boards', error);
  }
}

export async function clearAllBoards(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(CURRENT_KEY),
  ]);
  try {
    await sqliteSaveBoards([], 'main');
  } catch {
    // ignore
  }
}

export async function loadLandmarks(boardId: string): Promise<Landmark[]> {
  try {
    const { sqliteListLandmarks } = await import('./sqliteStore');
    const sql = await sqliteListLandmarks(boardId);
    if (sql.length > 0) return sql;
  } catch {
    // fall through
  }
  try {
    const raw = await AsyncStorage.getItem(LANDMARKS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Landmark[];
    return Array.isArray(all) ? all.filter((l) => l.boardId === boardId) : [];
  } catch {
    return [];
  }
}

export async function saveLandmark(landmark: Landmark): Promise<void> {
  try {
    const { sqliteUpsertLandmark } = await import('./sqliteStore');
    await sqliteUpsertLandmark(landmark);
  } catch {
    // ignore
  }
  try {
    const raw = await AsyncStorage.getItem(LANDMARKS_KEY);
    const all: Landmark[] = raw ? (JSON.parse(raw) as Landmark[]) : [];
    const next = [landmark, ...all.filter((l) => l.id !== landmark.id)].slice(0, 100);
    await AsyncStorage.setItem(LANDMARKS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function removeLandmark(id: string): Promise<void> {
  try {
    const { sqliteDeleteLandmark } = await import('./sqliteStore');
    await sqliteDeleteLandmark(id);
  } catch {
    // ignore
  }
  try {
    const raw = await AsyncStorage.getItem(LANDMARKS_KEY);
    const all: Landmark[] = raw ? (JSON.parse(raw) as Landmark[]) : [];
    await AsyncStorage.setItem(
      LANDMARKS_KEY,
      JSON.stringify(all.filter((l) => l.id !== id)),
    );
  } catch {
    // ignore
  }
}

export async function archiveBoardLocal(board: Board): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ARCHIVED_KEY);
    const all: Board[] = raw ? (JSON.parse(raw) as Board[]) : [];
    const next = [{ ...board, archived: true }, ...all.filter((b) => b.id !== board.id)].slice(
      0,
      30,
    );
    await AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function listArchivedBoards(): Promise<Board[]> {
  try {
    const raw = await AsyncStorage.getItem(ARCHIVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .map((b, i) => sanitizeBoard(b, i))
          .filter((b): b is Board => b !== null)
      : [];
  } catch {
    return [];
  }
}

export { sanitizeBoard, sanitizeItem };
