import { CENTER, findWinningLine, otherPlayer } from "./board";
import { applyMove, getLegalMoves } from "./rules";
import { countSafeReplies, evaluateMove } from "./solver";
import type { Board, GameState, Move, Player } from "./types";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

/** Random source injected so tests can make bot behaviour deterministic. */
export type Rng = () => number;

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

const wouldWin = (board: Board, player: Player, move: Move): boolean => {
  const next = board.slice();
  next[move.to] = player;
  next[move.from] = null;
  return findWinningLine(next, player) !== null;
};

const winningMoves = (board: Board, player: Player, moves: readonly Move[]): Move[] =>
  moves.filter((m) => wouldWin(board, player, m));

/** Easy: any legal move, chosen uniformly at random. */
export function chooseEasyMove(state: GameState, rng: Rng = Math.random): Move | null {
  const moves = getLegalMoves(state.board, state.turn);
  return moves.length ? pick(moves, rng) : null;
}

/**
 * Medium: win now → stop an immediate opponent win → avoid handing the
 * opponent a win next turn → prefer the centre → otherwise random.
 */
export function chooseMediumMove(state: GameState, rng: Rng = Math.random): Move | null {
  const me = state.turn;
  const opp = otherPlayer(me);
  const moves = getLegalMoves(state.board, me);
  if (moves.length === 0) return null;

  const wins = winningMoves(state.board, me, moves);
  if (wins.length) return pick(wins, rng);

  const survivable = moves.filter((m) => {
    const result = applyMove(state, m);
    if (!result.ok || result.state.status !== "playing") return true;
    const replies = getLegalMoves(result.state.board, opp);
    return winningMoves(result.state.board, opp, replies).length === 0;
  });
  const candidates = survivable.length ? survivable : moves;

  const central = candidates.filter((m) => m.to === CENTER);
  if (central.length) return pick(central, rng);
  return pick(candidates, rng);
}

/**
 * Hard: perfect play from the solved table. Wins as fast as possible, loses
 * as slowly as possible, and in drawn positions picks the move that leaves the
 * opponent the fewest non-losing replies (maximum trap pressure).
 */
export function chooseHardMove(state: GameState, rng: Rng = Math.random): Move | null {
  const moves = getLegalMoves(state.board, state.turn);
  if (moves.length === 0) return null;

  const scored = moves.map((move) => {
    const ev = evaluateMove(state, move);
    let score: number;
    if (ev.outcome === "win") score = 1000 - ev.depth;
    else if (ev.outcome === "loss") score = -1000 + ev.depth;
    else {
      const after = applyMove(state, move);
      const replies = after.ok ? getLegalMoves(after.state.board, after.state.turn) : [];
      const safe = after.ok ? countSafeReplies(after.state, replies) : replies.length;
      score = 100 - safe * 10 - (replies.length ? 0 : 50);
      // Keep drawn games alive: avoid walking into repetition when alternatives exist.
      if (after.ok) {
        const key = after.state.history[after.state.history.length - 1];
        const seen = after.state.history.filter((k) => k === key).length;
        if (after.state.drawReason === "repetition") score -= 40;
        else if (seen > 1) score -= 5;
      }
    }
    return { move, score };
  });

  const best = Math.max(...scored.map((s) => s.score));
  return pick(
    scored.filter((s) => s.score === best).map((s) => s.move),
    rng,
  );
}

export function chooseBotMove(
  state: GameState,
  difficulty: Difficulty,
  rng: Rng = Math.random,
): Move | null {
  switch (difficulty) {
    case "easy":
      return chooseEasyMove(state, rng);
    case "medium":
      return chooseMediumMove(state, rng);
    case "hard":
      return chooseHardMove(state, rng);
  }
}

export const BOT_THINK_DELAY_MS = { min: 320, max: 520 } as const;
