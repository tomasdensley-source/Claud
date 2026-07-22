import AsyncStorage from '@react-native-async-storage/async-storage';
import { Board } from '../types';

const SNAP_KEY = 'fieldnote.snapshots.v1';

export interface BoardSnapshot {
  id: string;
  createdAt: number;
  label: string;
  boards: Board[];
  currentBoardId: string;
}

export async function listSnapshots(): Promise<BoardSnapshot[]> {
  try {
    const raw = await AsyncStorage.getItem(SNAP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BoardSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export async function saveSnapshot(
  boards: Board[],
  currentBoardId: string,
  label?: string,
): Promise<BoardSnapshot> {
  const snap: BoardSnapshot = {
    id: `snap-${Date.now()}`,
    createdAt: Date.now(),
    label: label ?? new Date().toLocaleString(),
    boards: JSON.parse(JSON.stringify(boards)) as Board[],
    currentBoardId,
  };
  const prev = await listSnapshots();
  const next = [snap, ...prev].slice(0, 20);
  await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(next));
  return snap;
}

export async function loadSnapshot(id: string): Promise<BoardSnapshot | null> {
  const all = await listSnapshots();
  return all.find((s) => s.id === id) ?? null;
}
