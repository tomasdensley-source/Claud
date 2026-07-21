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

export function parsePackageJson(json: string): { board: Board; workingFiles: WorkingFileRecord[] } {
  const parsed = JSON.parse(json) as Partial<FieldnotePackage> & { board?: Board; boards?: Board[]; workingFiles?: unknown };
  const boardRaw = parsed.format === 'fieldnote-package' && parsed.board ? [parsed.board] : parsed.board ? [parsed.board] : parsed;
  const board = migrateBoards(boardRaw)[0];
  if (!board) throw new Error('No Fieldnote board found');
  const workingFiles = Array.isArray(parsed.workingFiles)
    ? parsed.workingFiles.filter((file): file is WorkingFileRecord =>
        Boolean(file && typeof file === 'object' && 'id' in file && 'name' in file && 'uri' in file),
      )
    : [];
  return { board, workingFiles };
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
