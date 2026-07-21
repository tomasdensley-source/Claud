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
    if (!value || value === 'null') return [];
    return migrateBoards(JSON.parse(value));
  };
  try {
    const boards = parse(raw);
    if (boards.length) {
      return {
        boards,
        currentBoardId: currentBoardId && boards.some((board) => board.id === currentBoardId) ? currentBoardId : boards[0].id,
        recoveredFromBackup: false,
        recoveredFromCorruptJson: false,
      };
    }
  } catch {
    const backupBoards = parse(backupRaw);
    if (backupBoards.length) {
      return {
        boards: backupBoards,
        currentBoardId: currentBoardId && backupBoards.some((board) => board.id === currentBoardId) ? currentBoardId : backupBoards[0].id,
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
    recoveredFromCorruptJson: Boolean(raw),
  };
}

export function estimateStorageUsage(boards: Board[], workingFiles: WorkingFileRecord[]) {
  const jsonBytes = serializeBoards(boards, workingFiles).length;
  const fileBytes = workingFiles.reduce((sum, file) => sum + Math.max(0, Math.min(file.size ?? 0, Number.MAX_SAFE_INTEGER)), 0);
  return { jsonBytes, fileBytes, totalBytes: jsonBytes + fileBytes };
}
