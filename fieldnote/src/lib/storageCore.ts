import { Board, WorkingFileRecord } from '../types';
import { createMainBoard } from './seed';
import { migrateBoards, STORAGE_SCHEMA_VERSION } from './migration';

export type ParsedBoards = {
  boards: Board[];
  currentBoardId: string;
  recoveredFromBackup: boolean;
  recoveredFromCorruptJson: boolean;
};

export function serializeBoards(boards: Board[], workingFiles: WorkingFileRecord[] = []) {
  return JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, boards, workingFiles });
}

export function parseBoardsWithBackup(raw: string | null, backupRaw: string | null, currentBoardId: string | null): ParsedBoards {
  const parse = (value: string | null) => {
    if (!value || value === 'null') return { boards: [] as Board[], failed: false };
    try {
      return { boards: migrateBoards(JSON.parse(value)), failed: false };
    } catch {
      return { boards: [] as Board[], failed: true };
    }
  };
  const parsed = parse(raw);
  if (parsed.boards.length) {
    return {
      boards: parsed.boards,
      currentBoardId: currentBoardId && parsed.boards.some((board) => board.id === currentBoardId) ? currentBoardId : parsed.boards[0].id,
      recoveredFromBackup: false,
      recoveredFromCorruptJson: false,
    };
  }
  if (parsed.failed) {
    const backup = parse(backupRaw);
    if (backup.boards.length) {
      return {
        boards: backup.boards,
        currentBoardId: currentBoardId && backup.boards.some((board) => board.id === currentBoardId) ? currentBoardId : backup.boards[0].id,
        recoveredFromBackup: true,
        recoveredFromCorruptJson: true,
      };
    }
  }
  const main = createMainBoard();
  return {
    boards: [main],
    currentBoardId: main.id,
    recoveredFromBackup: false,
    recoveredFromCorruptJson: Boolean(raw && raw !== 'null'),
  };
}

export function estimateStorageUsage(boards: Board[], workingFiles: WorkingFileRecord[]) {
  const jsonBytes = serializeBoards(boards, workingFiles).length;
  const fileBytes = workingFiles.reduce((sum, file) => sum + Math.max(0, Math.min(file.size ?? 0, Number.MAX_SAFE_INTEGER)), 0);
  return { jsonBytes, fileBytes, totalBytes: jsonBytes + fileBytes };
}
