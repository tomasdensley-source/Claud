/**
 * SQLite board store with soft fallback.
 * Uses expo-sqlite when native module is available; otherwise no-ops so
 * AsyncStorage path in storage.ts remains the safety net.
 */

import { Board } from '../types';

const DB_NAME = 'fieldnote.db';

type SqliteDb = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
};

let dbPromise: Promise<SqliteDb | null> | null = null;

async function openDb(): Promise<SqliteDb | null> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SQLite = require('expo-sqlite');
      const db = (await SQLite.openDatabaseAsync(DB_NAME)) as SqliteDb;
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS boards (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          archived INTEGER NOT NULL DEFAULT 0,
          payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS landmarks (
          id TEXT PRIMARY KEY NOT NULL,
          board_id TEXT NOT NULL,
          name TEXT NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
      try {
        await db.execAsync('ALTER TABLE landmarks ADD COLUMN zoom REAL');
      } catch {
        // Column already exists on upgraded installs.
      }
      return db;
    } catch (e) {
      console.warn('Fieldnote SQLite unavailable; using AsyncStorage only', e);
      return null;
    }
  })();
  return dbPromise;
}

export async function sqliteAvailable(): Promise<boolean> {
  return (await openDb()) != null;
}

export async function sqliteLoadBoards(): Promise<{
  boards: Board[];
  currentBoardId: string;
} | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const rows = await db.getAllAsync<{ payload: string; archived: number }>(
      'SELECT payload, archived FROM boards WHERE archived = 0 ORDER BY updated_at DESC',
    );
    const boards = rows
      .map((r) => {
        try {
          return JSON.parse(r.payload) as Board;
        } catch {
          return null;
        }
      })
      .filter((b): b is Board => !!b && Array.isArray(b.items));
    const current = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM meta WHERE key = 'currentBoardId'",
    );
    if (boards.length === 0) return null;
    const currentBoardId =
      current?.value && boards.some((b) => b.id === current.value)
        ? current.value
        : boards[0].id;
    return { boards, currentBoardId };
  } catch (e) {
    console.warn('sqliteLoadBoards failed', e);
    return null;
  }
}

export async function sqliteSaveBoards(
  boards: Board[],
  currentBoardId: string,
): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    await db.execAsync('BEGIN');
    await db.runAsync('DELETE FROM boards WHERE archived = 0');
    for (const board of boards) {
      await db.runAsync(
        `INSERT OR REPLACE INTO boards (id, name, updated_at, archived, payload)
         VALUES (?, ?, ?, 0, ?)`,
        board.id,
        board.name,
        board.updatedAt,
        JSON.stringify(board),
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('currentBoardId', ?)`,
      currentBoardId,
    );
    await db.execAsync('COMMIT');
    return true;
  } catch (e) {
    try {
      await db.execAsync('ROLLBACK');
    } catch {
      // ignore
    }
    console.warn('sqliteSaveBoards failed', e);
    return false;
  }
}

export async function sqliteArchiveBoard(boardId: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    await db.runAsync('UPDATE boards SET archived = 1 WHERE id = ?', boardId);
    return true;
  } catch {
    return false;
  }
}

export interface LandmarkRow {
  id: string;
  boardId: string;
  name: string;
  x: number;
  y: number;
  zoom?: number;
  createdAt: number;
}

export async function sqliteListLandmarks(boardId: string): Promise<LandmarkRow[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const rows = await db.getAllAsync<{
      id: string;
      board_id: string;
      name: string;
      x: number;
      y: number;
      zoom: number | null;
      created_at: number;
    }>('SELECT * FROM landmarks WHERE board_id = ? ORDER BY created_at DESC', boardId);
    return rows.map((r) => ({
      id: r.id,
      boardId: r.board_id,
      name: r.name,
      x: r.x,
      y: r.y,
      zoom:
        typeof r.zoom === 'number' && Number.isFinite(r.zoom) ? r.zoom : undefined,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function sqliteUpsertLandmark(landmark: LandmarkRow): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO landmarks (id, board_id, name, x, y, zoom, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      landmark.id,
      landmark.boardId,
      landmark.name,
      landmark.x,
      landmark.y,
      landmark.zoom ?? null,
      landmark.createdAt,
    );
    return true;
  } catch {
    return false;
  }
}

export async function sqliteDeleteLandmark(id: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    await db.runAsync('DELETE FROM landmarks WHERE id = ?', id);
    return true;
  } catch {
    return false;
  }
}
