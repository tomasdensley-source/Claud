import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BoardSnapshot, WorkingFile, UiPrefs } from '../types';
import { createMainBoard } from './seed';
import { COLORS } from './theme';

interface FieldnoteDB extends DBSchema {
  boards: { key: string; value: BoardSnapshot };
  files: { key: string; value: WorkingFile };
  blobs: { key: string; value: { id: string; data: ArrayBuffer; mime: string } };
}

const PREFS_KEY = 'fieldnote.ui.v1';
const CURRENT_KEY = 'fieldnote.current.v1';

let dbPromise: Promise<IDBPDatabase<FieldnoteDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<FieldnoteDB>('fieldnote-v1', 1, {
      upgrade(database) {
        database.createObjectStore('boards', { keyPath: 'id' });
        database.createObjectStore('files', { keyPath: 'id' });
        database.createObjectStore('blobs', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export function defaultPrefs(): UiPrefs {
  return {
    toolbar: { x: 12, y: 72, collapsed: false },
    paletteOpen: false,
    lastColor: COLORS.clay,
    textFormat: {
      fontSize: 22,
      fontWeight: 400,
      color: COLORS.ink,
      align: 'left',
    },
    draw: { color: COLORS.ink, width: 3, tool: 'pen' },
  };
}

export async function loadBoards(): Promise<{ boards: BoardSnapshot[]; currentId: string }> {
  const database = await db();
  let boards = await database.getAll('boards');
  if (!boards.length) {
    const main = createMainBoard();
    await database.put('boards', main);
    boards = [main];
  }
  const currentId = localStorage.getItem(CURRENT_KEY) ?? boards[0].id;
  return { boards, currentId: boards.some((b) => b.id === currentId) ? currentId : boards[0].id };
}

export async function saveBoard(board: BoardSnapshot) {
  const database = await db();
  await database.put('boards', { ...board, updatedAt: Date.now() });
}

export async function deleteBoard(id: string) {
  const database = await db();
  await database.delete('boards', id);
}

export async function setCurrentBoardId(id: string) {
  localStorage.setItem(CURRENT_KEY, id);
}

export function loadPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs();
    return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: UiPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function loadFiles(): Promise<WorkingFile[]> {
  const database = await db();
  return database.getAll('files');
}

export async function saveFile(file: WorkingFile) {
  const database = await db();
  await database.put('files', file);
}

export async function deleteFile(id: string) {
  const database = await db();
  await database.delete('files', id);
}

/** Snapshot without embedding large file bytes — references Working Files by id/src */
export function exportSnapshotPackage(board: BoardSnapshot, files: WorkingFile[]) {
  const usedSrcs = new Set(
    board.objects
      .map((o) => ('src' in o ? (o as { src?: string }).src : undefined))
      .filter(Boolean) as string[],
  );
  return {
    version: 1,
    exportedAt: Date.now(),
    board,
    files: files.filter((f) => usedSrcs.has(f.src) || true),
  };
}

export async function estimateStorage(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}
