import { describe, expect, it } from "vitest";
import {
  CELL_COUNT,
  NEIGHBORS,
  areAdjacent,
  boardFromMasks,
  findWinningLine,
  toMask,
} from "../board";
import {
  applyMove,
  createInitialState,
  getLegalDestinations,
  getLegalMoves,
  hasLegalMoves,
  validateMove,
} from "../rules";
import type { Board, GameState, Move, Player } from "../types";

const B = (s: string): Board =>
  s.replace(/\s/g, "").split("").map((c) => (c === "r" ? "red" : c === "b" ? "blue" : null));

const stateWith = (board: Board, turn: Player, extra: Partial<GameState> = {}): GameState => ({
  ...createInitialState(),
  board,
  turn,
  history: [],
  ...extra,
});

const play = (start: GameState, moves: Move[]): GameState =>
  moves.reduce((s, m) => {
    const r = applyMove(s, m);
    if (!r.ok) throw new Error(`illegal ${m.from}->${m.to}: ${r.reason}`);
    return r.state;
  }, start);

describe("initial state", () => {
  it("places Red left, Blue right, centre column empty, Red to move", () => {
    const s = createInitialState();
    expect(s.board).toEqual(B("r.b r.b r.b"));
    expect(s.turn).toBe("red");
    expect(s.status).toBe("playing");
    expect(s.ply).toBe(0);
    expect(s.history).toHaveLength(1);
  });
  it("is not already won by either side (home columns do not count)", () => {
    const s = createInitialState();
    expect(findWinningLine(s.board, "red")).toBeNull();
    expect(findWinningLine(s.board, "blue")).toBeNull();
  });
});

describe("geometry", () => {
  it("centre touches all 8 cells, corners touch 3, edges touch 5", () => {
    expect(NEIGHBORS[4]).toHaveLength(8);
    for (const c of [0, 2, 6, 8]) expect(NEIGHBORS[c]).toHaveLength(3);
    for (const e of [1, 3, 5, 7]) expect(NEIGHBORS[e]).toHaveLength(5);
  });
  it("adjacency is symmetric and excludes self", () => {
    for (let a = 0; a < CELL_COUNT; a++) {
      expect(areAdjacent(a, a)).toBe(false);
      for (let b = 0; b < CELL_COUNT; b++) expect(areAdjacent(a, b)).toBe(areAdjacent(b, a));
    }
  });
});

describe("movement", () => {
  it("allows a centre piece to move in all 8 directions", () => {
    const board = B("... .r. ...");
    const dests = getLegalDestinations(board, 4).sort();
    expect(dests).toEqual([0, 1, 2, 3, 5, 6, 7, 8]);
    for (const to of dests) {
      expect(validateMove(stateWith(board, "red"), { from: 4, to })).toBeNull();
    }
  });
  it("rejects moves of more than one step", () => {
    const s = createInitialState();
    expect(validateMove(s, { from: 0, to: 2 })).toBe("not-adjacent");
    expect(validateMove(stateWith(B("r.. ... ..."), "red"), { from: 0, to: 8 })).toBe("not-adjacent");
    expect(validateMove(stateWith(B("r.. ... ..."), "red"), { from: 0, to: 6 })).toBe("not-adjacent");
  });
  it("rejects occupied destinations, empty sources, opponent pieces, same cell", () => {
    const s = createInitialState();
    expect(validateMove(s, { from: 0, to: 3 })).toBe("destination-occupied");
    expect(validateMove(s, { from: 1, to: 4 })).toBe("empty-source");
    expect(validateMove(s, { from: 2, to: 1 })).toBe("not-your-piece");
    expect(validateMove(s, { from: 0, to: 0 })).toBe("same-cell");
  });
  it("rejects invalid coordinates and out-of-turn identity", () => {
    const s = createInitialState();
    expect(validateMove(s, { from: -1, to: 1 })).toBe("invalid-cell");
    expect(validateMove(s, { from: 0, to: 9 })).toBe("invalid-cell");
    expect(validateMove(s, { from: 0.5 as number, to: 1 })).toBe("invalid-cell");
    expect(validateMove(s, { from: 0, to: 1 }, "blue")).toBe("not-your-turn");
    expect(validateMove(s, { from: 0, to: 1 }, "red")).toBeNull();
  });
  it("alternates turns and records history", () => {
    const s = play(createInitialState(), [{ from: 3, to: 4 }]);
    expect(s.turn).toBe("blue");
    expect(s.board[4]).toBe("red");
    expect(s.board[3]).toBeNull();
    expect(s.ply).toBe(1);
    expect(s.lastMove).toEqual({ from: 3, to: 4 });
    expect(s.history).toHaveLength(2);
  });
  it("does not mutate the previous state", () => {
    const s = createInitialState();
    const before = JSON.stringify(s);
    applyMove(s, { from: 3, to: 4 });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("win detection", () => {
  it("detects a horizontal win", () => {
    const s = stateWith(B("rr. ... bbb"), "red");
    const r = applyMove(s, { from: 0, to: 2 } as Move);
    // 0 -> 2 is not adjacent; use a real move instead
    expect(r.ok).toBe(false);
    const s2 = stateWith(B("rr. ..r bbb"), "red");
    const r2 = applyMove(s2, { from: 5, to: 2 });
    expect(r2.ok && r2.state.status).toBe("won");
    expect(r2.ok && r2.state.winner).toBe("red");
    expect(r2.ok && r2.state.winningLine).toEqual([0, 1, 2]);
  });
  it("detects a vertical win in the middle column", () => {
    const s = stateWith(B(".b. rbr r.r"), "blue");
    const r = applyMove(s, { from: 1, to: 1 + 0 });
    expect(r.ok).toBe(false);
    const s2 = stateWith(B("bb. r.r rbr"), "blue");
    const r2 = applyMove(s2, { from: 0, to: 4 });
    expect(r2.ok && r2.state.winner).toBe("blue");
    expect(r2.ok && r2.state.winningLine).toEqual([1, 4, 7]);
  });
  it("detects diagonal wins", () => {
    const s = stateWith(B("r.b .r. b.b"), "red");
    // red 0,4; need 8 (blue). Move blue to check the other diagonal instead.
    const s2 = stateWith(B("..b .b. r.r"), "blue");
    const r = applyMove(s2, { from: 2, to: 6 } as Move);
    expect(r.ok).toBe(false); // not adjacent
    const s3 = stateWith(B("r.b rb. .br"), "blue");
    const r3 = applyMove(s3, { from: 7, to: 6 });
    expect(r3.ok && r3.state.winner).toBe("blue");
    expect(r3.ok && r3.state.winningLine).toEqual([2, 4, 6]);
    expect(findWinningLine(s.board, "red")).toBeNull();
  });
  it("never counts a player's own home column", () => {
    const s = stateWith(B("r.b .rb r.b"), "red");
    const r = applyMove(s, { from: 4, to: 3 });
    expect(r.ok && r.state.status).toBe("playing");
    const s2 = stateWith(B("r.b rb. r.b"), "blue");
    const r2 = applyMove(s2, { from: 4, to: 5 });
    expect(r2.ok && r2.state.status).toBe("playing");
  });
  it("counts the opponent's home column", () => {
    const s = stateWith(B("b.r br. b.r"), "red");
    const r = applyMove(s, { from: 4, to: 5 });
    expect(r.ok && r.state.winner).toBe("red");
  });
  it("refuses moves after the game is over", () => {
    const s = stateWith(B("rrr b.b b.."), "blue", { status: "won", winner: "red" });
    expect(validateMove(s, { from: 3, to: 4 })).toBe("game-over");
  });
});

describe("draw detection", () => {
  it("recognises a boxed-in side (stalemate guard)", () => {
    // Boxing a side in requires filling the middle column, which is itself a
    // win — so stalemate is unreachable in real play, but the guard exists.
    expect(hasLegalMoves(B("rb. rb. rb."), "red")).toBe(false);
    expect(hasLegalMoves(B("r.. rb. rb."), "red")).toBe(true);
  });
  it("declares a draw on the third repetition of a position", () => {
    let s = createInitialState();
    const cycle: Move[] = [
      { from: 3, to: 4 }, { from: 5, to: 1 },
      { from: 4, to: 3 }, { from: 1, to: 5 },
    ];
    s = play(s, cycle); // 2nd occurrence
    expect(s.status).toBe("playing");
    s = play(s, cycle); // 3rd occurrence
    expect(s.status).toBe("draw");
    expect(s.drawReason).toBe("repetition");
  });
});

describe("fuzz: random play never breaks invariants", () => {
  it("keeps piece counts, alternates turns, and only accepts legal moves", () => {
    let seed = 1234;
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let game = 0; game < 300; game++) {
      let s = createInitialState();
      let guard = 0;
      while (s.status === "playing" && guard++ < 200) {
        // adversarial random attempts must be rejected unless truly legal
        const from = Math.floor(rng() * 11) - 1;
        const to = Math.floor(rng() * 11) - 1;
        const legal = getLegalMoves(s.board, s.turn).some((m) => m.from === from && m.to === to);
        const attempt = applyMove(s, { from, to });
        expect(attempt.ok).toBe(legal);
        const moves = getLegalMoves(s.board, s.turn);
        const m = moves[Math.floor(rng() * moves.length)];
        const r = applyMove(s, m);
        expect(r.ok).toBe(true);
        if (!r.ok) break;
        const prevTurn = s.turn;
        s = r.state;
        expect(toMask(s.board, "red").toString(2).split("1").length - 1).toBe(3);
        expect(toMask(s.board, "blue").toString(2).split("1").length - 1).toBe(3);
        expect(s.turn).not.toBe(prevTurn);
        if (s.status === "won") {
          expect(s.winner).toBe(prevTurn);
          expect(findWinningLine(s.board, prevTurn)).not.toBeNull();
        }
      }
      expect(s.status === "playing" && guard >= 200).toBe(false);
    }
  });
  it("boardFromMasks round-trips", () => {
    const board = B("r.b .rb r.b");
    expect(boardFromMasks(toMask(board, "red"), toMask(board, "blue"))).toEqual(board);
  });
});
