import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board, BoardItem, ItemType } from '../types';
import { createMainBoard } from './seed';

const STORAGE_KEY = 'fieldnote.boards.v1';
const CURRENT_KEY = 'fieldnote.currentBoardId.v1';

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
      };
    case 'mindmap':
      return {
        ...base,
        type: 'mindmap',
        text: asString(item.text, 'Idea'),
        children: Array.isArray(item.children)
          ? item.children.filter((c): c is string => typeof c === 'string')
          : [],
      };
    case 'region':
      return {
        ...base,
        type: 'region',
        label: asString(item.label, 'Region'),
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
      };
    case 'folder':
      return {
        ...base,
        type: 'folder',
        name: asString(item.name, 'Folder'),
        fileCount: Math.max(0, asNumber(item.fileCount, 0)),
      };
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
  };
}

export async function loadBoards(): Promise<{ boards: Board[]; currentBoardId: string }> {
  try {
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
      : [];
    if (boards.length === 0) {
      const main = createMainBoard();
      return { boards: [main], currentBoardId: main.id };
    }
    const currentBoardId =
      current && boards.some((b) => b.id === current) ? current : boards[0].id;
    return { boards, currentBoardId };
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
}
