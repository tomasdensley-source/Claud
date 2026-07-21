import { Board, BoardItem, WorkingFileRecord } from '../types';
import { migrateBoards, STORAGE_SCHEMA_VERSION } from './migration';

export const FIELDNOTE_PACKAGE_VERSION = STORAGE_SCHEMA_VERSION;

export type FieldnotePackage = {
  format: 'fieldnote-package';
  schemaVersion: number;
  exportedAt: number;
  board: Board;
  workingFiles: WorkingFileRecord[];
  blobs: Record<string, { mimeType?: string; size?: number; base64?: string; skipped?: string }>;
};

export type ParsedFieldnotePackage = {
  board: Board;
  workingFiles: WorkingFileRecord[];
  blobs: FieldnotePackage['blobs'];
};

function portableItem(item: BoardItem): BoardItem {
  if ((item.type === 'file' || item.type === 'image' || item.type === 'audio' || item.type === 'pdf' || item.type === 'markdown') && item.uri) {
    return { ...item, uri: toPortableUri(item.uri) ?? item.uri } as BoardItem;
  }
  return item;
}

function toPortableUri(uri?: string) {
  if (!uri) return uri;
  const marker = 'fieldnote-files/';
  const index = uri.indexOf(marker);
  return index >= 0 ? uri.slice(index) : uri;
}

export function createPackagePayload(board: Board, workingFiles: WorkingFileRecord[], blobs: FieldnotePackage['blobs'] = {}): FieldnotePackage {
  return {
    format: 'fieldnote-package',
    schemaVersion: FIELDNOTE_PACKAGE_VERSION,
    exportedAt: Date.now(),
    board: { ...board, items: board.items.map(portableItem) },
    workingFiles: workingFiles.map((file) => ({ ...file, uri: toPortableUri(file.uri) ?? file.uri })),
    blobs,
  };
}

function sanitizeBlobs(raw: unknown): FieldnotePackage['blobs'] {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).flatMap(([key, value]) => {
      if (!key.startsWith('fieldnote-files/') || !value || typeof value !== 'object') return [];
      const blob = value as { mimeType?: unknown; size?: unknown; base64?: unknown; skipped?: unknown };
      if (typeof blob.base64 !== 'string' && typeof blob.skipped !== 'string') return [];
      return [[key, {
        mimeType: typeof blob.mimeType === 'string' ? blob.mimeType : undefined,
        size: typeof blob.size === 'number' && Number.isFinite(blob.size) ? blob.size : undefined,
        base64: typeof blob.base64 === 'string' ? blob.base64 : undefined,
        skipped: typeof blob.skipped === 'string' ? blob.skipped : undefined,
      }]];
    }),
  );
}

export function parsePackageJson(json: string): ParsedFieldnotePackage {
  const parsed = JSON.parse(json) as Partial<FieldnotePackage> & { board?: Board; boards?: Board[]; workingFiles?: unknown };
  if (parsed.format && parsed.format !== 'fieldnote-package') throw new Error('Unsupported Fieldnote package');
  const boardRaw = parsed.format === 'fieldnote-package' && parsed.board ? [parsed.board] : parsed.board ? [parsed.board] : parsed;
  const board = migrateBoards(boardRaw)[0];
  if (!board) throw new Error('No Fieldnote board found');
  const workingFiles = Array.isArray(parsed.workingFiles)
    ? parsed.workingFiles.filter((file): file is WorkingFileRecord =>
        Boolean(file && typeof file === 'object' && 'id' in file && 'name' in file && 'uri' in file),
      )
    : [];
  return { board, workingFiles, blobs: sanitizeBlobs(parsed.blobs) };
}

export function conflictSafeBoardName(name: string, existingNames: string[]) {
  if (!existingNames.includes(name)) return name;
  let index = 2;
  let candidate = `${name} (${index})`;
  while (existingNames.includes(candidate)) {
    index += 1;
    candidate = `${name} (${index})`;
  }
  return candidate;
}
