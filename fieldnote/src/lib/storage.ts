import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board, WorkingFileRecord } from '../types';
import { createMainBoard } from './seed';
import { migrateBoards, STORAGE_SCHEMA_VERSION } from './migration';

const STORAGE_KEY = 'fieldnote.boards.v2';
const LEGACY_STORAGE_KEY = 'fieldnote.boards.v1';
const CURRENT_KEY = 'fieldnote.currentBoardId.v1';
const WORKING_FILES_KEY = 'fieldnote.workingFiles.v1';
const ONBOARDING_KEY = 'fieldnote.onboarding.dismissed.v1';

export interface LoadBoardsResult {
  boards: Board[];
  currentBoardId: string;
  recoveredFromCorruptJson: boolean;
}

export async function loadBoards(): Promise<LoadBoardsResult> {
  try {
    const [rawV2, rawLegacy, current] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_STORAGE_KEY),
      AsyncStorage.getItem(CURRENT_KEY),
    ]);
    const raw = rawV2 ?? rawLegacy;
    if (!raw) {
      const main = createMainBoard();
      return { boards: [main], currentBoardId: main.id, recoveredFromCorruptJson: false };
    }
    const parsed = JSON.parse(raw) as unknown;
    const boards = migrateBoards(parsed);
    if (boards.length === 0) {
      const main = createMainBoard();
      return { boards: [main], currentBoardId: main.id, recoveredFromCorruptJson: false };
    }
    const currentBoardId =
      current && boards.some((b) => b.id === current) ? current : boards[0].id;
    return { boards, currentBoardId, recoveredFromCorruptJson: false };
  } catch {
    const main = createMainBoard();
    return { boards: [main], currentBoardId: main.id, recoveredFromCorruptJson: true };
  }
}

export async function saveBoards(boards: Board[], currentBoardId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, boards }),
    ),
    AsyncStorage.setItem(CURRENT_KEY, currentBoardId),
  ]);
}

export async function loadWorkingFiles(): Promise<WorkingFileRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(WORKING_FILES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
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

export async function loadOnboardingDismissed(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
}

export async function saveOnboardingDismissed(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}

export async function clearAllBoards(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
    AsyncStorage.removeItem(CURRENT_KEY),
    AsyncStorage.removeItem(WORKING_FILES_KEY),
  ]);
}
