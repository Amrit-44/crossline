import {
  CELL_COUNT,
  NEIGHBORS,
  areAdjacent,
  findWinningLine,
  isValidCell,
  otherPlayer,
} from "./board";
import type { Board, GameState, Move, MoveRejection, MoveResult, Player } from "./types";

/**
 * A position repeated this many times (same board, same side to move) is a
 * draw. Required because perfect play is a draw (see docs/BALANCE.md) and
 * pieces can shuffle indefinitely otherwise.
 */
export const REPETITION_LIMIT = 3;

export const FIRST_PLAYER: Player = "red";

export const INITIAL_BOARD: Board = [
  "red", null, "blue",
  "red", null, "blue",
  "red", null, "blue",
];

export const positionKey = (board: Board, turn: Player): string =>
  board.map((cell) => (cell === "red" ? "r" : cell === "blue" ? "b" : ".")).join("") + turn[0];

export function createInitialState(): GameState {
  return {
    board: INITIAL_BOARD,
    turn: FIRST_PLAYER,
    status: "playing",
    winner: null,
    winningLine: null,
    drawReason: null,
    ply: 0,
    lastMove: null,
    history: [positionKey(INITIAL_BOARD, FIRST_PLAYER)],
  };
}

export function getLegalDestinations(board: Board, from: number): number[] {
  if (!isValidCell(from) || board[from] === null) return [];
  return NEIGHBORS[from].filter((to) => board[to] === null);
}

export function getLegalMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < CELL_COUNT; from++) {
    if (board[from] !== player) continue;
    for (const to of NEIGHBORS[from]) {
      if (board[to] === null) moves.push({ from, to });
    }
  }
  return moves;
}

export const hasLegalMoves = (board: Board, player: Player): boolean =>
  getLegalMoves(board, player).length > 0;

/**
 * Validates a move against the full game state. `asPlayer` lets callers
 * (e.g. the server) assert the identity of the mover as well.
 */
export function validateMove(
  state: GameState,
  move: Move,
  asPlayer?: Player,
): MoveRejection | null {
  if (state.status !== "playing") return "game-over";
  if (asPlayer !== undefined && asPlayer !== state.turn) return "not-your-turn";
  if (!isValidCell(move.from) || !isValidCell(move.to)) return "invalid-cell";
  if (move.from === move.to) return "same-cell";
  const source = state.board[move.from];
  if (source === null) return "empty-source";
  if (source !== state.turn) return "not-your-piece";
  if (!areAdjacent(move.from, move.to)) return "not-adjacent";
  if (state.board[move.to] !== null) return "destination-occupied";
  return null;
}

/** Applies a move, evaluating win / draw conditions. Pure; never mutates. */
export function applyMove(state: GameState, move: Move, asPlayer?: Player): MoveResult {
  const rejection = validateMove(state, move, asPlayer);
  if (rejection) return { ok: false, reason: rejection };

  const mover = state.turn;
  const board = state.board.slice();
  board[move.to] = mover;
  board[move.from] = null;

  const next = otherPlayer(mover);
  const ply = state.ply + 1;
  const key = positionKey(board, next);
  const history = [...state.history, key];

  const base = {
    board,
    turn: next,
    ply,
    lastMove: move,
    history,
  };

  const winningLine = findWinningLine(board, mover);
  if (winningLine) {
    return {
      ok: true,
      state: { ...base, status: "won", winner: mover, winningLine, drawReason: null },
    };
  }

  const repetitions = history.filter((k) => k === key).length;
  if (repetitions >= REPETITION_LIMIT) {
    return {
      ok: true,
      state: { ...base, status: "draw", winner: null, winningLine: null, drawReason: "repetition" },
    };
  }

  if (!hasLegalMoves(board, next)) {
    return {
      ok: true,
      state: { ...base, status: "draw", winner: null, winningLine: null, drawReason: "stalemate" },
    };
  }

  return { ok: true, state: { ...base, status: "playing", winner: null, winningLine: null, drawReason: null } };
}
