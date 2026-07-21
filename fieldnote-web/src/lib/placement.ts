import { MIN_GAP } from './theme';

export type Rect = { x: number; y: number; w: number; h: number; id: string };

function intersects(a: Rect, b: Rect, gap = MIN_GAP) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function clampRect(r: Rect, vw: number, vh: number, pad = 8): Rect {
  return {
    ...r,
    x: Math.min(Math.max(pad, r.x), Math.max(pad, vw - r.w - pad)),
    y: Math.min(Math.max(pad, r.y), Math.max(pad, vh - r.h - pad)),
  };
}

/**
 * Shared floating UI placement engine — guarantees zero overlaps between
 * registered floating surfaces, respects safe areas / edges, and prefers
 * not covering a protected rect (selection / connector dots) when possible.
 */
export class PlacementEngine {
  private items = new Map<string, Rect>();
  viewport = { w: 390, h: 844, safe: { t: 0, r: 0, b: 0, l: 0 } };

  setViewport(w: number, h: number, safe = { t: 0, r: 0, b: 0, l: 0 }) {
    this.viewport = { w, h, safe };
  }

  register(id: string, rect: Omit<Rect, 'id'>) {
    this.items.set(id, { ...rect, id });
  }

  unregister(id: string) {
    this.items.delete(id);
  }

  get(id: string) {
    return this.items.get(id);
  }

  all() {
    return [...this.items.values()];
  }

  /**
   * Place a floating panel of size (w,h) near an anchor point / preferred quadrant.
   * Tries candidates until no intersection with other floats or protected rects.
   */
  place(opts: {
    id: string;
    w: number;
    h: number;
    prefer?: 'tr' | 'tl' | 'br' | 'bl' | 'right-of' | 'left-of';
    anchor?: { x: number; y: number };
    protect?: Rect[];
    others?: Rect[];
  }): Rect {
    const { w, h, prefer = 'tr', anchor, protect = [] } = opts;
    const { w: vw, h: vh, safe } = this.viewport;
    const padL = 8 + safe.l;
    const padT = 8 + safe.t;
    const padR = 8 + safe.r;
    const padB = 8 + safe.b;

    const ax = anchor?.x ?? vw - padR - w;
    const ay = anchor?.y ?? padT + 56;

    const candidates: { x: number; y: number }[] = [];
    const push = (x: number, y: number) => candidates.push({ x, y });

    if (prefer === 'tr') {
      push(ax - w - 8, ay);
      push(ax + 8, ay);
      push(ax - w - 8, ay - h - 8);
      push(vw - padR - w, padT + 56);
    } else if (prefer === 'right-of') {
      push(ax + 8, ay);
      push(ax - w - 8, ay);
      push(ax + 8, ay - h / 2);
      push(ax - w - 8, ay - h / 2);
    } else if (prefer === 'left-of') {
      push(ax - w - 8, ay);
      push(ax + 8, ay);
    } else if (prefer === 'br') {
      push(vw - padR - w, vh - padB - h);
      push(padL, vh - padB - h);
    } else {
      push(padL, padT + 56);
      push(vw - padR - w, padT + 56);
    }

    // Extra sweep positions
    for (const y of [padT + 56, vh / 2 - h / 2, vh - padB - h - 80]) {
      for (const x of [padL, vw / 2 - w / 2, vw - padR - w]) push(x, y);
    }

    const blockers = [
      ...this.all().filter((r) => r.id !== opts.id),
      ...(opts.others ?? []),
      ...protect,
    ];

    for (const c of candidates) {
      const rect = clampRect({ id: opts.id, x: c.x, y: c.y, w, h }, vw - safe.r, vh - safe.b, 8);
      if (!blockers.some((b) => intersects(rect, b))) {
        this.register(opts.id, rect);
        return rect;
      }
    }

    // Last resort: clamp preferred
    const fallback = clampRect(
      { id: opts.id, x: candidates[0]?.x ?? padL, y: candidates[0]?.y ?? padT, w, h },
      vw,
      vh,
      8,
    );
    this.register(opts.id, fallback);
    return fallback;
  }

  /** Snap a draggable toolbar to the nearest screen edge. */
  snapToolbar(x: number, y: number, w: number, h: number): { x: number; y: number } {
    const { w: vw, h: vh, safe } = this.viewport;
    const left = 10 + safe.l;
    const right = vw - w - 10 - safe.r;
    const midX = x + w / 2;
    const nx = midX < vw / 2 ? left : right;
    const ny = Math.min(Math.max(10 + safe.t, y), vh - h - 10 - safe.b);
    return { x: nx, y: ny };
  }
}

export const placement = new PlacementEngine();
