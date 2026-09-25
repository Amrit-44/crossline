import type { Board, CellValue, Player } from "./types";

export const BOARD_SIZE = 3;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const CENTER = 4;
export const PIECES_PER_SIDE = 3;

/** All eight winning alignments (rows, columns, diagonals). */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const LINE_MASKS: readonly number[] = LINES.map((line) =>
  line.reduce((mask, cell) => mask | (1 << cell), 0),
);

export const FULL_MASK = (1 << CELL_COUNT) - 1;

export const rowOf = (index: number): number => Math.floor(index / BOARD_SIZE);
export const colOf = (index: number): number => index % BOARD_SIZE;
export const indexOf = (row: number, col: number): number => row * BOARD_SIZE + col;

export const isValidCell = (index: unknown): index is number =>
  typeof index === "number" && Number.isInteger(index) && index >= 0 && index < CELL_COUNT;

/** Eight-direction, one-step neighbours for each cell (precomputed). */
export const NEIGHBORS: readonly (readonly number[])[] = Array.from(
  { length: CELL_COUNT },
  (_, index) => {
    const r = rowOf(index);
    const c = colOf(index);
    const result: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
        result.push(indexOf(nr, nc));
      }
    }
    return result;
  },
);

export const NEIGHBOR_MASKS: readonly number[] = NEIGHBORS.map((cells) =>
  cells.reduce((mask, cell) => mask | (1 << cell), 0),
);

export const areAdjacent = (a: number, b: number): boolean =>
  (NEIGHBOR_MASKS[a] & (1 << b)) !== 0;

export const otherPlayer = (player: Player): Player => (player === "red" ? "blue" : "red");

export const toMask = (board: Board, player: Player): number =>
  board.reduce<number>((mask, cell, index) => (cell === player ? mask | (1 << index) : mask), 0);

/**
 * Each side starts already aligned in its home column, so that column can
 * never count as a win for its owner. Every other alignment (rows, the middle
 * column, both diagonals, and the *opponent's* home column) wins.
 */
export const HOME_COLUMN: Record<Player, readonly number[]> = {
  red: [0, 3, 6],
  blue: [2, 5, 8],
};

const HOME_COLUMN_MASK: Record<Player, number> = {
  red: HOME_COLUMN.red.reduce((m, c) => m | (1 << c), 0),
  blue: HOME_COLUMN.blue.reduce((m, c) => m | (1 << c), 0),
};

/** Indices into LINES that count as a win for the given player. */
export const WIN_LINE_INDICES: Record<Player, readonly number[]> = {
  red: LINE_MASKS.map((m, i) => (m === HOME_COLUMN_MASK.red ? -1 : i)).filter((i) => i >= 0),
  blue: LINE_MASKS.map((m, i) => (m === HOME_COLUMN_MASK.blue ? -1 : i)).filter((i) => i >= 0),
};

export const maskHasLine = (mask: number, player: Player): boolean =>
  WIN_LINE_INDICES[player].some((i) => (mask & LINE_MASKS[i]) === LINE_MASKS[i]);

export const findLineInMask = (mask: number, player: Player): readonly number[] | null => {
  for (const i of WIN_LINE_INDICES[player]) {
    if ((mask & LINE_MASKS[i]) === LINE_MASKS[i]) return LINES[i];
  }
  return null;
};

export const findWinningLine = (board: Board, player: Player): readonly number[] | null =>
  findLineInMask(toMask(board, player), player);

export const boardFromMasks = (redMask: number, blueMask: number): Board =>
  Array.from({ length: CELL_COUNT }, (_, i): CellValue => {
    if (redMask & (1 << i)) return "red";
    if (blueMask & (1 << i)) return "blue";
    return null;
  });

export const popCount = (mask: number): number => {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
};
