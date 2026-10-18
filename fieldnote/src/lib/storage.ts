import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board } from '../types';
import { createMainBoard } from './seed';

const STORAGE_KEY = 'fieldnote.boards.v1';
const CURRENT_KEY = 'fieldnote.currentBoardId.v1';
const PALETTE_KEY = 'fieldnote.paletteSlots.v1';

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
    const boards = JSON.parse(raw) as Board[];
    if (!Array.isArray(boards) || boards.length === 0) {
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
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(boards)),
    AsyncStorage.setItem(CURRENT_KEY, currentBoardId),
  ]);
}

export async function clearAllBoards(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(CURRENT_KEY),
  ]);
}

// Persists the palette's custom color slots only — separate from board content
// so resetting/clearing boards never discards a user's saved colors.
export async function loadPaletteSlots(fallback: string[]): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PALETTE_KEY);
    if (!raw) return fallback;
    const slots = JSON.parse(raw) as unknown;
    if (!Array.isArray(slots) || slots.some((s) => typeof s !== 'string')) return fallback;
    return slots as string[];
  } catch {
    return fallback;
  }
}

export async function savePaletteSlots(slots: string[]): Promise<void> {
  await AsyncStorage.setItem(PALETTE_KEY, JSON.stringify(slots));
}
