import { BoardItem } from '../types';

// Auto-repair for boards whose coordinates arrived broken — most commonly
// AI-generated boards pasted in as JSON Canvas, where cards land with missing
// numbers, everything stacked at the same point, or a layout so huge it's
// unusable at any zoom level.

const MIN_WIDTH = 80;
const MIN_HEIGHT = 60;
const FALLBACK_WIDTH = 240;
const FALLBACK_HEIGHT = 160;

// Positions within this many world units of each other count as "stacked".
const DUPLICATE_EPSILON = 0.5;
const DUPLICATE_SPREAD = 48;

// Above these thresholds the layout is treated as broken rather than just large.
const EXTREME_COORD = 1_000_000;
const EXTREME_EXTENT = 200_000;
const REPAIRED_TARGET_EXTENT = 2000;

export interface RepairResult {
  items: BoardItem[];
  changed: boolean;
  issues: string[];
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function repairBoardItems(items: BoardItem[]): RepairResult {
  const issues: string[] = [];
  let changed = false;

  // Pass 1 — fix individual items with missing or invalid position/size.
  let fixedIndividually = false;
  let fixed: BoardItem[] = items.map((raw) => {
    const it = { ...raw };
    if (!isFiniteNumber(it.x)) {
      it.x = 0;
      fixedIndividually = true;
    }
    if (!isFiniteNumber(it.y)) {
      it.y = 0;
      fixedIndividually = true;
    }
    if (!isFiniteNumber(it.width) || it.width <= 0) {
      it.width = FALLBACK_WIDTH;
      fixedIndividually = true;
    } else if (it.width < MIN_WIDTH) {
      it.width = MIN_WIDTH;
      fixedIndividually = true;
    }
    if (!isFiniteNumber(it.height) || it.height <= 0) {
      it.height = FALLBACK_HEIGHT;
      fixedIndividually = true;
    } else if (it.height < MIN_HEIGHT) {
      it.height = MIN_HEIGHT;
      fixedIndividually = true;
    }
    return it;
  });
  if (fixedIndividually) {
    changed = true;
    issues.push('Fixed missing or invalid position/size on one or more cards.');
  }

  // Pass 2 — rescale and recenter if the whole layout is at an extreme, unusable scale.
  if (fixed.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasExtremeCoord = false;
    fixed.forEach((it) => {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + it.width);
      maxY = Math.max(maxY, it.y + it.height);
      if (Math.abs(it.x) > EXTREME_COORD || Math.abs(it.y) > EXTREME_COORD) {
        hasExtremeCoord = true;
      }
    });
    const extentX = maxX - minX;
    const extentY = maxY - minY;
    if (hasExtremeCoord || extentX > EXTREME_EXTENT || extentY > EXTREME_EXTENT) {
      const scale = Math.min(1, REPAIRED_TARGET_EXTENT / Math.max(extentX, extentY, 1));
      fixed = fixed.map((it) => ({
        ...it,
        x: (it.x - minX) * scale,
        y: (it.y - minY) * scale,
        width: Math.max(MIN_WIDTH, it.width * scale),
        height: Math.max(MIN_HEIGHT, it.height * scale),
      }));
      changed = true;
      issues.push('Rescaled and recentered an out-of-range board layout.');
    }
  }

  // Pass 3 — spread cards stacked exactly on top of each other.
  const seen = new Map<string, number>();
  let hadDuplicates = false;
  fixed = fixed.map((it) => {
    const key = `${Math.round(it.x / DUPLICATE_EPSILON)}:${Math.round(it.y / DUPLICATE_EPSILON)}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return it;
    hadDuplicates = true;
    return { ...it, x: it.x + count * DUPLICATE_SPREAD, y: it.y + count * DUPLICATE_SPREAD };
  });
  if (hadDuplicates) {
    changed = true;
    issues.push('Spread cards that were stacked exactly on top of each other.');
  }

  return { items: fixed, changed, issues };
}
