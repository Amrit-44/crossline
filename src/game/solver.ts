import {
  CELL_COUNT,
  FULL_MASK,
  NEIGHBOR_MASKS,
  PIECES_PER_SIDE,
  maskHasLine,
  popCount,
  toMask,
} from "./board";
import type { GameState, Move, Player } from "./types";

/**
 * Exact retrograde analysis of the whole game.
 *
 * The state space is tiny (C(9,3) * C(6,3) * 2 = 3,360 positions), so we
 * solve every position once and reuse the table for the Hard bot and for
 * balance analysis. Values are from the perspective of the side to move.
 * Positions that never resolve are draws by infinite play (repetition).
 */
export type Outcome = "win" | "loss" | "draw";

export interface Evaluation {
  readonly outcome: Outcome;
  /** Plies until the forced result (0 for terminal positions, 0 for draws). */
  readonly depth: number;
}

type Entry = { outcome: Outcome | null; depth: number; children: number[] | null };

const RED_BIT = 0;

export const encode = (redMask: number, blueMask: number, turn: Player): number =>
  redMask | (blueMask << CELL_COUNT) | ((turn === "red" ? RED_BIT : 1) << (CELL_COUNT * 2));

export const encodeState = (state: GameState): number =>
  encode(toMask(state.board, "red"), toMask(state.board, "blue"), state.turn);

const decode = (key: number) => ({
  redMask: key & FULL_MASK,
  blueMask: (key >> CELL_COUNT) & FULL_MASK,
  turn: ((key >> (CELL_COUNT * 2)) & 1) === RED_BIT ? ("red" as const) : ("blue" as const),
});

/** Generates child keys for a position using bitmasks (mirrors rules.getLegalMoves). */
function childKeys(key: number): number[] {
  const { redMask, blueMask, turn } = decode(key);
  const own = turn === "red" ? redMask : blueMask;
  const occupied = redMask | blueMask;
  const next: Player = turn === "red" ? "blue" : "red";
  const children: number[] = [];
  for (let from = 0; from < CELL_COUNT; from++) {
    if (!(own & (1 << from))) continue;
    let targets = NEIGHBOR_MASKS[from] & ~occupied;
    while (targets) {
      const to = 31 - Math.clz32(targets & -targets);
      targets &= targets - 1;
      const moved = (own & ~(1 << from)) | (1 << to);
      children.push(
        turn === "red" ? encode(moved, blueMask, next) : encode(redMask, moved, next),
      );
    }
  }
  return children;
}

function enumerateKeys(): number[] {
  const keys: number[] = [];
  for (let red = 0; red <= FULL_MASK; red++) {
    if (popCount(red) !== PIECES_PER_SIDE) continue;
    for (let blue = 0; blue <= FULL_MASK; blue++) {
      if (popCount(blue) !== PIECES_PER_SIDE || red & blue) continue;
      keys.push(encode(red, blue, "red"), encode(red, blue, "blue"));
    }
  }
  return keys;
}

function solve(): Map<number, Evaluation> {
  const table = new Map<number, Entry>();
  const keys = enumerateKeys();

  for (const key of keys) {
    const { redMask, blueMask, turn } = decode(key);
    const own = turn === "red" ? redMask : blueMask;
    const opp = turn === "red" ? blueMask : redMask;
    const entry: Entry = { outcome: null, depth: 0, children: null };
    const next: Player = turn === "red" ? "blue" : "red";
    if (maskHasLine(opp, next)) {
      entry.outcome = "loss"; // opponent's last move completed a line
    } else if (maskHasLine(own, turn)) {
      entry.outcome = "win"; // unreachable in real play, kept for completeness
    } else {
      entry.children = childKeys(key);
      if (entry.children.length === 0) entry.outcome = "draw"; // stalemate
    }
    table.set(key, entry);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const key of keys) {
      const entry = table.get(key)!;
      if (entry.outcome !== null || !entry.children) continue;
      let bestWin = Infinity;
      let allWin = true;
      let worstWin = -1;
      for (const child of entry.children) {
        const c = table.get(child)!;
        if (c.outcome === "loss") bestWin = Math.min(bestWin, c.depth + 1);
        if (c.outcome !== "win") allWin = false;
        else worstWin = Math.max(worstWin, c.depth + 1);
      }
      if (bestWin !== Infinity) {
        entry.outcome = "win";
        entry.depth = bestWin;
        changed = true;
      } else if (allWin) {
        entry.outcome = "loss";
        entry.depth = worstWin;
        changed = true;
      }
    }
  }

  const result = new Map<number, Evaluation>();
  for (const [key, entry] of table) {
    result.set(key, { outcome: entry.outcome ?? "draw", depth: entry.depth });
  }
  return result;
}

let cachedTable: Map<number, Evaluation> | null = null;

/** Solves lazily and caches; ~3k states, well under 50ms on any device. */
export function getSolvedTable(): Map<number, Evaluation> {
  if (!cachedTable) cachedTable = solve();
  return cachedTable;
}

export function evaluateState(state: GameState): Evaluation {
  return getSolvedTable().get(encodeState(state)) ?? { outcome: "draw", depth: 0 };
}

/** Evaluates a move from the perspective of the player making it. */
export function evaluateMove(state: GameState, move: Move): Evaluation {
  const redMask = toMask(state.board, "red");
  const blueMask = toMask(state.board, "blue");
  const own = state.turn === "red" ? redMask : blueMask;
  const moved = (own & ~(1 << move.from)) | (1 << move.to);
  const next: Player = state.turn === "red" ? "blue" : "red";
  const key =
    state.turn === "red" ? encode(moved, blueMask, next) : encode(redMask, moved, next);
  const child = getSolvedTable().get(key) ?? { outcome: "draw" as const, depth: 0 };
  const outcome: Outcome =
    child.outcome === "win" ? "loss" : child.outcome === "loss" ? "win" : "draw";
  return { outcome, depth: child.depth + (child.outcome === "draw" ? 0 : 1) };
}

/** Number of moves that do not lose by force — a cheap "pressure" metric. */
export function countSafeReplies(state: GameState, moves: readonly Move[]): number {
  return moves.filter((m) => evaluateMove(state, m).outcome !== "loss").length;
}
