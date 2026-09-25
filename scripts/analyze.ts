/**
 * Solvability analysis for Crossline (3x3 duel).
 * Run with: npx tsx scripts/analyze.ts
 */
import { createInitialState, getLegalMoves, applyMove } from "../src/game/rules";
import { evaluateState, evaluateMove, getSolvedTable } from "../src/game/solver";

const table = getSolvedTable();
const counts = { win: 0, loss: 0, draw: 0 };
for (const e of table.values()) counts[e.outcome]++;
console.log("States:", table.size, counts);

const start = createInitialState();
const root = evaluateState(start);
console.log("Initial position (Red to move):", root);

console.log("\nRed opening moves:");
for (const m of getLegalMoves(start.board, start.turn)) {
  const ev = evaluateMove(start, m);
  const after = applyMove(start, m);
  const blueReplies = after.ok ? getLegalMoves(after.state.board, "blue").map(r => `${r.from}->${r.to}:${evaluateMove(after.state, r).outcome[0]}${evaluateMove(after.state, r).depth}`).join(" ") : "";
  console.log(`  ${m.from}->${m.to}: ${ev.outcome} in ${ev.depth}   | blue replies: ${blueReplies}`);
}
