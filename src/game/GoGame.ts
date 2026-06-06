/* ============================================================================
 * GoGame.ts — Go rules engine (UI-agnostic)
 *
 * Implements a complete, rules-correct game of Go:
 *   - alternating play, configurable board size (9 / 13 / 19)
 *   - group / liberty detection via flood fill
 *   - capture of opponent groups reduced to zero liberties
 *   - suicide prohibition
 *   - positional superko (no repeated whole-board position)
 *   - passing; two consecutive passes end the game
 *   - area scoring (stones + surrounded territory) with komi
 *   - full undo via state snapshots
 * ==========================================================================*/

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Stone = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Player = typeof BLACK | typeof WHITE;

export interface Point {
  x: number;
  y: number;
}

export interface MoveResult {
  ok: boolean;
  reason?: string;
  captured?: number;
  gameOver?: boolean;
}

export interface ScoreResult {
  black: number;
  white: number;
  territory: { black: number; white: number; neutral: number };
  winner: 'Black' | 'White' | 'Draw';
}

interface Snapshot {
  board: Stone[];
  toMove: Player;
  captures: Record<Player, number>;
  passes: number;
  gameOver: boolean;
  lastMove: Point | null;
  positionKeys: Set<string>;
}

export class GoGame {
  size: number;
  komi: number;
  board: Stone[];
  toMove: Player;
  captures: Record<Player, number>;
  passes: number;
  gameOver: boolean;
  lastMove: Point | null;
  private history: Snapshot[];
  private positionKeys: Set<string>;

  constructor(size = 19, komi = 6.5) {
    this.size = size;
    this.komi = komi;
    this.board = [];
    this.toMove = BLACK;
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.passes = 0;
    this.gameOver = false;
    this.lastMove = null;
    this.history = [];
    this.positionKeys = new Set();
    this.reset(size, komi);
  }

  reset(size = this.size, komi = this.komi): void {
    this.size = size;
    this.komi = komi;
    this.board = new Array(size * size).fill(EMPTY);
    this.toMove = BLACK;
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.passes = 0;
    this.gameOver = false;
    this.lastMove = null;
    this.history = [];
    this.positionKeys = new Set([this.positionKey()]);
  }

  idx(x: number, y: number): number {
    return y * this.size + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  get(x: number, y: number): Stone {
    return this.board[this.idx(x, y)];
  }

  private neighbors(x: number, y: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    if (x > 0) out.push([x - 1, y]);
    if (x < this.size - 1) out.push([x + 1, y]);
    if (y > 0) out.push([x, y - 1]);
    if (y < this.size - 1) out.push([x, y + 1]);
    return out;
  }

  /* Flood-fill the connected group of same-colored stones containing (x,y). */
  groupAt(x: number, y: number): { stones: number[]; liberties: number } {
    const color = this.get(x, y);
    const start = this.idx(x, y);
    const stones: number[] = [];
    const seen = new Uint8Array(this.board.length);
    const libSet = new Set<number>();
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const cell = stack.pop() as number;
      stones.push(cell);
      const cx = cell % this.size;
      const cy = (cell - cx) / this.size;
      for (const [nx, ny] of this.neighbors(cx, cy)) {
        const n = this.idx(nx, ny);
        const v = this.board[n];
        if (v === EMPTY) {
          libSet.add(n);
        } else if (v === color && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    return { stones, liberties: libSet.size };
  }

  private positionKey(): string {
    return this.board.join('') + '|' + this.toMove;
  }

  private snapshot(): Snapshot {
    return {
      board: this.board.slice(),
      toMove: this.toMove,
      captures: { [BLACK]: this.captures[BLACK], [WHITE]: this.captures[WHITE] },
      passes: this.passes,
      gameOver: this.gameOver,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      positionKeys: new Set(this.positionKeys),
    };
  }

  private restore(s: Snapshot): void {
    this.board = s.board.slice();
    this.toMove = s.toMove;
    this.captures = { [BLACK]: s.captures[BLACK], [WHITE]: s.captures[WHITE] };
    this.passes = s.passes;
    this.gameOver = s.gameOver;
    this.lastMove = s.lastMove ? { ...s.lastMove } : null;
    this.positionKeys = new Set(s.positionKeys);
  }

  /* Test legality of the current player's move at (x,y) without committing. */
  tryMove(x: number, y: number): {
    legal: boolean;
    reason?: string;
    captured?: number;
    resultingKey?: string;
    nextBoard?: Stone[];
  } {
    if (this.gameOver) return { legal: false, reason: 'The game is over.' };
    if (!this.inBounds(x, y)) return { legal: false, reason: 'Off the board.' };
    if (this.get(x, y) !== EMPTY) return { legal: false, reason: 'That point is occupied.' };

    const color = this.toMove;
    const opp: Player = color === BLACK ? WHITE : BLACK;

    const original = this.board;
    this.board = original.slice();
    this.board[this.idx(x, y)] = color;

    // 1) Remove any opponent groups left with no liberties.
    let captured = 0;
    for (const [nx, ny] of this.neighbors(x, y)) {
      if (this.get(nx, ny) === opp) {
        const g = this.groupAt(nx, ny);
        if (g.liberties === 0) {
          for (const cell of g.stones) this.board[cell] = EMPTY;
          captured += g.stones.length;
        }
      }
    }

    // 2) Suicide check.
    const ownLiberties = this.groupAt(x, y).liberties;
    if (ownLiberties === 0) {
      this.board = original;
      return { legal: false, reason: 'Illegal: suicide.' };
    }

    // 3) Superko: resulting position must not repeat.
    const resultingKey = this.board.join('') + '|' + opp;
    if (this.positionKeys.has(resultingKey)) {
      const nextBoard = this.board;
      this.board = original;
      void nextBoard;
      return { legal: false, reason: 'Illegal: repeats a previous position (ko).' };
    }

    const nextBoard = this.board;
    this.board = original;
    return { legal: true, captured, resultingKey, nextBoard };
  }

  playMove(x: number, y: number): MoveResult {
    const test = this.tryMove(x, y);
    if (!test.legal) return { ok: false, reason: test.reason };

    this.history.push(this.snapshot());

    this.board = test.nextBoard as Stone[];
    this.captures[this.toMove] += test.captured ?? 0;
    this.lastMove = { x, y };
    this.passes = 0;
    this.toMove = this.toMove === BLACK ? WHITE : BLACK;
    this.positionKeys.add(test.resultingKey as string);

    return { ok: true, captured: test.captured };
  }

  pass(): MoveResult {
    if (this.gameOver) return { ok: false, reason: 'The game is over.' };
    this.history.push(this.snapshot());
    this.passes += 1;
    this.lastMove = null;
    this.toMove = this.toMove === BLACK ? WHITE : BLACK;
    this.positionKeys.add(this.positionKey());
    if (this.passes >= 2) this.gameOver = true;
    return { ok: true, gameOver: this.gameOver };
  }

  undo(): MoveResult {
    if (this.history.length === 0) return { ok: false, reason: 'Nothing to undo.' };
    this.restore(this.history.pop() as Snapshot);
    return { ok: true };
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  /* Area scoring (Chinese style) with komi added to White. */
  score(): ScoreResult {
    const seen = new Uint8Array(this.board.length);
    let blackTerr = 0;
    let whiteTerr = 0;
    let neutral = 0;

    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] !== EMPTY || seen[i]) continue;

      const region: number[] = [];
      const borders = new Set<Stone>();
      const stack = [i];
      seen[i] = 1;
      while (stack.length) {
        const cell = stack.pop() as number;
        region.push(cell);
        const cx = cell % this.size;
        const cy = (cell - cx) / this.size;
        for (const [nx, ny] of this.neighbors(cx, cy)) {
          const n = this.idx(nx, ny);
          const v = this.board[n];
          if (v === EMPTY) {
            if (!seen[n]) {
              seen[n] = 1;
              stack.push(n);
            }
          } else {
            borders.add(v);
          }
        }
      }

      if (borders.size === 1) {
        if (borders.has(BLACK)) blackTerr += region.length;
        else whiteTerr += region.length;
      } else {
        neutral += region.length;
      }
    }

    let blackStones = 0;
    let whiteStones = 0;
    for (const v of this.board) {
      if (v === BLACK) blackStones++;
      else if (v === WHITE) whiteStones++;
    }

    const black = blackStones + blackTerr;
    const white = whiteStones + whiteTerr + this.komi;
    const winner: 'Black' | 'White' | 'Draw' =
      black > white ? 'Black' : white > black ? 'White' : 'Draw';

    return { black, white, territory: { black: blackTerr, white: whiteTerr, neutral }, winner };
  }
}
