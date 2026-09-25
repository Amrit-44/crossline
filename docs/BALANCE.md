# Balance analysis — Crossline

`scripts/analyze.ts` (run with `npx tsx scripts/analyze.ts`) performs an exact
retrograde analysis of the complete game using `src/game/solver.ts`.

## State space

- 3×3 board, 3 Red + 3 Blue pieces, 3 empty cells
- C(9,3) × C(6,3) × 2 sides-to-move = **3,360 positions**
- Solved to fixpoint in a few milliseconds; the same table drives the Hard bot.

## Rule clarification discovered by the solver

The starting position places Red in the left column and Blue in the right
column — both are already three-in-a-row. Under a literal reading of the rules
the game would be over before the first move (the solver reported the opening
as an immediate loss for Red because Blue's column "won").

Resolution: **a player's own home column never counts as a win for that
player.** Rows, the middle column, both diagonals and the *opponent's* home
column all win. This is the smallest change that makes the rules coherent.

## Result under perfect play

| Metric | Value |
| --- | --- |
| Opening position | **Draw** |
| Positions that are wins for side to move | 1,926 |
| Positions that are losses for side to move | 572 |
| Drawn positions (infinite play) | 862 |

Every one of Red's seven opening moves is a draw with best play, and after
each opening Blue has between one and three replies that lose by force
(in 4–6 plies). There is therefore **no first-player advantage** and no
balancing mechanism (swap / pie rule) is required — one was deliberately not
added.

## Consequence for the rules

Because perfect play never ends, the engine treats the third occurrence of the
same position (same board, same side to move) as a **draw by repetition**, in
addition to the stalemate draw (no legal moves) from the PRD.
