export type Player = "red" | "blue";

export type CellValue = Player | null;

/** 9 cells, row-major: index = row * 3 + col. */
export type Board = readonly CellValue[];

export interface Move {
  readonly from: number;
  readonly to: number;
}

export type GameStatus = "playing" | "won" | "draw";

export type DrawReason = "stalemate" | "repetition";

export interface GameState {
  readonly board: Board;
  readonly turn: Player;
  readonly status: GameStatus;
  readonly winner: Player | null;
  readonly winningLine: readonly number[] | null;
  readonly drawReason: DrawReason | null;
  /** Number of half-moves played so far. */
  readonly ply: number;
  readonly lastMove: Move | null;
  /**
   * Position keys (board + side to move) seen so far, including the current
   * one. Used for threefold-repetition draws.
   */
  readonly history: readonly string[];
}

export type MoveRejection =
  | "game-over"
  | "invalid-cell"
  | "same-cell"
  | "empty-source"
  | "not-your-piece"
  | "not-your-turn"
  | "not-adjacent"
  | "destination-occupied";

export type MoveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: MoveRejection };
