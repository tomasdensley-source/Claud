import AsyncStorage from '@react-native-async-storage/async-storage';

const SWATCH_KEY = 'fieldnote.colorSwatches.v1';
const FOLDED_KEY = 'fieldnote.colorPalette.folded.v1';

export const DEFAULT_SWATCHES = [
  '#34261d',
  '#cb7d46',
  '#2f6fed',
  '#2f9e6b',
  '#c43c3c',
  '#edb64a',
  '#ffffff',
  '#fbf6ec',
];

export type ColorTarget = 'frame' | 'body';

export async function loadSwatches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SWATCH_KEY);
    if (!raw) return DEFAULT_SWATCHES.slice();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SWATCHES.slice();
    return parsed.filter((c): c is string => typeof c === 'string').slice(0, 12);
  } catch {
    return DEFAULT_SWATCHES.slice();
  }
}

export async function saveSwatches(swatches: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SWATCH_KEY, JSON.stringify(swatches.slice(0, 12)));
  } catch {
    // ignore
  }
}

export async function loadPaletteFolded(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FOLDED_KEY);
    return raw !== '0';
  } catch {
    return true;
  }
}

export async function savePaletteFolded(folded: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLDED_KEY, folded ? '1' : '0');
  } catch {
    // ignore
  }
}

export function rememberSwatch(swatches: string[], color: string): string[] {
  const next = [color, ...swatches.filter((c) => c.toLowerCase() !== color.toLowerCase())];
  return next.slice(0, 12);
}
