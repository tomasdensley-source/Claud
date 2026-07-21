import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BoardObject, BoardSnapshot, WorkingFile, UiPrefs } from '../types';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  getBlob,
  parseBlobRef,
  putBlob,
  toBlobRef,
} from './blobs';
import { createMainBoard } from './seed';
import { COLORS } from './theme';

interface FieldnoteDB extends DBSchema {
  boards: { key: string; value: BoardSnapshot };
  files: { key: string; value: WorkingFile };
  blobs: { key: string; value: { id: string; data: ArrayBuffer; mime: string } };
}

export interface SnapshotPackage {
  version: 1;
  exportedAt: number;
  board: BoardSnapshot;
  files: WorkingFile[];
  blobs: Record<string, { mime: string; base64: string }>;
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
    filesSheet: 'peek',
    backgroundEdit: false,
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

export function exportSnapshotPackageSync(board: BoardSnapshot, files: WorkingFile[]): SnapshotPackage {
  return {
    version: 1,
    exportedAt: Date.now(),
    board,
    files,
    blobs: {},
  };
}

export async function exportSnapshotPackage(board: BoardSnapshot, files: WorkingFile[]): Promise<SnapshotPackage> {
  return exportPackageWithBlobs(board, files);
}

export async function exportPackageWithBlobs(board: BoardSnapshot, files: WorkingFile[]): Promise<SnapshotPackage> {
  const blobIds = collectPackageBlobIds(board, files);
  const blobs: SnapshotPackage['blobs'] = {};

  for (const id of blobIds) {
    const stored = await getBlob(id);
    if (!stored) continue;
    blobs[id] = {
      mime: stored.mime,
      base64: arrayBufferToBase64(stored.data),
    };
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    board,
    files,
    blobs,
  };
}

export async function importSnapshotPackage(pkg: SnapshotPackage): Promise<{ board: BoardSnapshot; files: WorkingFile[] }> {
  if (!pkg || pkg.version !== 1 || !pkg.board || !Array.isArray(pkg.files)) {
    throw new Error('Unsupported Fieldnote package');
  }

  const idMap = new Map<string, string>();
  for (const [oldId, blob] of Object.entries(pkg.blobs ?? {})) {
    const newId = makeImportedBlobId(oldId);
    await putBlob(newId, base64ToArrayBuffer(blob.base64), blob.mime);
    idMap.set(oldId, newId);
  }

  const board = rewriteBoardBlobRefs(pkg.board, idMap);
  const files = pkg.files.map((file) => rewriteWorkingFileBlobRefs(file, idMap));

  await saveBoard(board);
  await Promise.all(files.map((file) => saveFile(file)));
  await setCurrentBoardId(board.id);

  return { board, files };
}

export async function estimateStorage(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}

function collectPackageBlobIds(board: BoardSnapshot, files: WorkingFile[]): Set<string> {
  const ids = new Set<string>();

  board.objects.forEach((obj) => {
    collectObjectBlobIds(obj, ids);
  });

  files.forEach((file) => {
    const srcId = parseBlobRef(file.src);
    if (srcId) ids.add(srcId);
    if (file.blobId) ids.add(file.blobId);
  });

  return ids;
}

function collectObjectBlobIds(obj: BoardObject, ids: Set<string>) {
  if ('src' in obj) {
    const srcId = parseBlobRef(obj.src);
    if (srcId) ids.add(srcId);
  }

  if ('blobId' in obj && typeof obj.blobId === 'string') {
    ids.add(obj.blobId);
  }
}

function rewriteBoardBlobRefs(board: BoardSnapshot, idMap: Map<string, string>): BoardSnapshot {
  return {
    ...board,
    objects: board.objects.map((obj) => rewriteObjectBlobRefs(obj, idMap)),
  };
}

function rewriteObjectBlobRefs(obj: BoardObject, idMap: Map<string, string>): BoardObject {
  const next: BoardObject = { ...obj };

  if ('src' in next) {
    const srcId = parseBlobRef(next.src);
    if (srcId && idMap.has(srcId)) {
      next.src = toBlobRef(idMap.get(srcId)!);
    }
  }

  if ('blobId' in next && typeof next.blobId === 'string' && idMap.has(next.blobId)) {
    next.blobId = idMap.get(next.blobId);
  }

  return next;
}

function rewriteWorkingFileBlobRefs(file: WorkingFile, idMap: Map<string, string>): WorkingFile {
  const srcId = parseBlobRef(file.src);
  const blobId = file.blobId && idMap.has(file.blobId) ? idMap.get(file.blobId) : file.blobId;

  return {
    ...file,
    src: srcId && idMap.has(srcId) ? toBlobRef(idMap.get(srcId)!) : file.src,
    blobId,
  };
}

function makeImportedBlobId(oldId: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `blob-import-${crypto.randomUUID()}`;
  }

  return `blob-import-${oldId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
