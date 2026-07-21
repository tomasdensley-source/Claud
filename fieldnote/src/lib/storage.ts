import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board, WorkingFileRecord } from '../types';
import { parseBoardsWithBackup, serializeBoards } from './storageCore';
import { migrateBoards } from './migration';

const STORAGE_KEY = 'fieldnote.boards.v2';
const LEGACY_STORAGE_KEY = 'fieldnote.boards.v1';
const CURRENT_KEY = 'fieldnote.currentBoardId.v1';
const WORKING_FILES_KEY = 'fieldnote.workingFiles.v1';
const ONBOARDING_KEY = 'fieldnote.onboarding.dismissed.1.0.6';
const CLIPBOARD_KEY = 'fieldnote.clipboard.v1';
const BACKUP_KEY = 'fieldnote.boards.backup.v1';

export interface LoadBoardsResult {
  boards: Board[];
  currentBoardId: string;
  recoveredFromCorruptJson: boolean;
  recoveredFromBackup: boolean;
}

export async function loadBoards(): Promise<LoadBoardsResult> {
  const [rawV2, rawLegacy, backup, current] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    AsyncStorage.getItem(BACKUP_KEY),
    AsyncStorage.getItem(CURRENT_KEY),
  ]);
  const raw = rawV2 ?? rawLegacy;
  const parsed = parseBoardsWithBackup(raw, backup, current);
  if (parsed.recoveredFromCorruptJson && raw && raw !== 'null') {
    await AsyncStorage.setItem(`${BACKUP_KEY}.${Date.now()}`, raw).catch(() => undefined);
  }
  return parsed;
}

export async function saveBoards(boards: Board[], currentBoardId: string, workingFiles: WorkingFileRecord[] = []): Promise<void> {
  const payload = serializeBoards(boards, workingFiles);
  await AsyncStorage.setItem(BACKUP_KEY, payload);
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY, payload),
    AsyncStorage.setItem(CURRENT_KEY, currentBoardId),
  ]);
}

export async function loadWorkingFiles(): Promise<WorkingFileRecord[]> {
  try {
    const [raw, boardRaw] = await Promise.all([AsyncStorage.getItem(WORKING_FILES_KEY), AsyncStorage.getItem(STORAGE_KEY)]);
    const boardPayload = boardRaw ? JSON.parse(boardRaw) as { workingFiles?: unknown } : {};
    const parsed = raw ? (JSON.parse(raw) as unknown) : boardPayload.workingFiles ?? [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((file): file is WorkingFileRecord =>
      Boolean(file && typeof file === 'object' && 'id' in file && 'name' in file && 'uri' in file),
    );
  } catch {
    return [];
  }
}

export async function saveWorkingFiles(files: WorkingFileRecord[]): Promise<void> {
  await AsyncStorage.setItem(WORKING_FILES_KEY, JSON.stringify(files));
}

export async function loadClipboard(): Promise<unknown[]> {
  try {
    const raw = await AsyncStorage.getItem(CLIPBOARD_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveClipboard(items: unknown[]): Promise<void> {
  await AsyncStorage.setItem(CLIPBOARD_KEY, JSON.stringify(items));
}

export async function loadOnboardingDismissed(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
}

export async function saveOnboardingDismissed(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}

export async function clearAllBoards(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys().catch(() => []);
  const timestampedBackups = keys.filter((key) => key.startsWith(`${BACKUP_KEY}.`));
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    AsyncStorage.removeItem(CURRENT_KEY),
    AsyncStorage.removeItem(WORKING_FILES_KEY),
    AsyncStorage.removeItem(CLIPBOARD_KEY),
    AsyncStorage.removeItem(BACKUP_KEY),
    ...timestampedBackups.map((key) => AsyncStorage.removeItem(key)),
  ]);
}

export async function restoreBoardsFromBackup(): Promise<LoadBoardsResult | null> {
  const [backup, current] = await Promise.all([AsyncStorage.getItem(BACKUP_KEY), AsyncStorage.getItem(CURRENT_KEY)]);
  if (!backup || backup === 'null') return null;
  const restored = parseBoardsWithBackup(backup, null, current);
  await AsyncStorage.setItem(STORAGE_KEY, backup);
  await AsyncStorage.setItem(CURRENT_KEY, restored.currentBoardId);
  return { ...restored, recoveredFromBackup: true };
}
