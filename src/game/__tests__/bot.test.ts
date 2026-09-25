import { describe, expect, it } from "vitest";
import { chooseBotMove, chooseHardMove, chooseMediumMove, DIFFICULTIES } from "../bot";
import { applyMove, createInitialState, getLegalMoves } from "../rules";
import { evaluateMove, evaluateState, getSolvedTable } from "../solver";
import type { Board, GameState, Player } from "../types";

const B = (s: string): Board =>
  s.replace(/\s/g, "").split("").map((c) => (c === "r" ? "red" : c === "b" ? "blue" : null));
const stateWith = (board: Board, turn: Player): GameState => ({
  ...createInitialState(),
  board,
  turn,
  history: [],
});

let seed = 42;
const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

describe("solver", () => {
  it("solves the full state space and finds the opening is a draw", () => {
    expect(getSolvedTable().size).toBe(3360);
    expect(evaluateState(createInitialState()).outcome).toBe("draw");
  });
  it("agrees with the rules engine on immediate wins", () => {
    const s = stateWith(B("rr. ..r bbb"), "red");
    expect(evaluateMove(s, { from: 5, to: 2 })).toEqual({ outcome: "win", depth: 1 });
  });
});

describe("bots", () => {
  it("never make an illegal move at any difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      for (let g = 0; g < 60; g++) {
        let s = createInitialState();
        let guard = 0;
        while (s.status === "playing" && guard++ < 150) {
          const m = chooseBotMove(s, difficulty, rng);
          expect(m).not.toBeNull();
          const legal = getLegalMoves(s.board, s.turn).some(
            (x) => x.from === m!.from && x.to === m!.to,
          );
          expect(legal).toBe(true);
          const r = applyMove(s, m!);
          expect(r.ok).toBe(true);
          if (r.ok) s = r.state;
        }
      }
    }
  });
  it("medium takes an immediate win", () => {
    const s = stateWith(B("rr. ..r bbb"), "red");
    expect(chooseMediumMove(s, rng)).toEqual({ from: 5, to: 2 });
  });
  it("medium blocks an immediate opponent win", () => {
    // Red threatens 0,1,2 via 5->2. Blue's only block is 4->2.
    const s = stateWith(B("rr. bbr ..b"), "blue");
    const m = chooseMediumMove(s, rng)!;
    expect(m).toEqual({ from: 4, to: 2 });
    const after = applyMove(s, m);
    expect(after.ok).toBe(true);
    if (after.ok) {
      const redWins = getLegalMoves(after.state.board, "red").filter((rm) => {
        const r = applyMove(after.state, rm);
        return r.ok && r.state.winner === "red";
      });
      expect(redWins).toHaveLength(0);
    }
  });
  it("hard never loses from the opening against random play", () => {
    for (let g = 0; g < 40; g++) {
      let s = createInitialState();
      let guard = 0;
      while (s.status === "playing" && guard++ < 150) {
        const m =
          s.turn === "blue"
            ? chooseHardMove(s, rng)!
            : getLegalMoves(s.board, s.turn)[Math.floor(rng() * getLegalMoves(s.board, s.turn).length)];
        const r = applyMove(s, m);
        if (r.ok) s = r.state;
      }
      expect(s.winner).not.toBe("red");
    }
  });
  it("hard converts a won position", () => {
    const s = stateWith(B("rr. ..r bbb"), "red");
    expect(chooseHardMove(s, rng)).toEqual({ from: 5, to: 2 });
  });
});
