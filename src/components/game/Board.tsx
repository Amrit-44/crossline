"use client";

import { useMemo, useState } from "react";
import { BOARD_SIZE, colOf, indexOf, rowOf } from "@/game/board";
import type { GameState, Player } from "@/game/types";
import type { useBoardInteraction } from "@/hooks/useBoardInteraction";
import { Piece } from "./Piece";

type Interaction = ReturnType<typeof useBoardInteraction>;

interface BoardProps {
  state: GameState;
  interaction: Interaction;
  /** Which colour the local user controls (null = both, as in Local mode). */
  perspective: Player | null;
  pending?: boolean;
  disabled?: boolean;
  showLegalMoves?: boolean;
}

const CELL_CENTER = (index: number) => ({ x: colOf(index) * 100 + 50, y: rowOf(index) * 100 + 50 });

/** Controlled irregularity: nine slightly different hand-drawn corner sets. */
const CELL_RADII = [
  "22% 18% 24% 19% / 19% 24% 18% 22%",
  "18% 23% 19% 22% / 23% 18% 22% 19%",
  "24% 19% 22% 18% / 18% 22% 19% 24%",
  "19% 22% 18% 23% / 22% 19% 24% 18%",
  "21% 20% 23% 19% / 20% 23% 19% 21%",
  "23% 18% 20% 22% / 19% 21% 23% 18%",
  "18% 24% 19% 21% / 24% 18% 21% 19%",
  "22% 19% 24% 18% / 18% 24% 19% 22%",
  "20% 22% 18% 23% / 23% 19% 21% 18%",
];

/** Wobbly hand-drawn grid lines drawn once behind the cells. */
function SketchGrid() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 300"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <g className="text-ink" opacity="0.9">
        <path d="M102 12 Q 100 90, 103 150 T 101 288" />
        <path d="M198 10 Q 200 100, 197 160 T 199 290" />
        <path d="M12 102 Q 90 100, 150 103 T 288 101" />
        <path d="M10 198 Q 100 200, 160 197 T 290 199" />
      </g>
    </svg>
  );
}

const describe = (state: GameState, index: number, selected: boolean, valid: boolean, winning: boolean) => {
  const content = state.board[index];
  const parts = [
    content ? `${content === "red" ? "X" : "O"} piece` : "Empty cell",
    `row ${rowOf(index) + 1}`,
    `column ${colOf(index) + 1}`,
  ];
  if (selected) parts.push("selected");
  if (valid) parts.push("valid destination");
  if (winning) parts.push("winning piece");
  return parts.join(", ");
};

function buildIds(board: GameState["board"]): (number | null)[] {
  let next = 0;
  return board.map((cell) => (cell ? next++ : null));
}

/**
 * Stable token identities so React keeps the same DOM node when a piece
 * moves, letting CSS animate the translation. Uses the documented
 * "derived state during render" pattern (conditional setState in render,
 * never in an effect, never via refs).
 */
function usePieceIds(state: GameState): (number | null)[] {
  const [cache, setCache] = useState<{ ply: number; ids: (number | null)[] }>(() => ({
    ply: state.ply,
    ids: buildIds(state.board),
  }));
  if (state.ply !== cache.ply) {
    if (
      state.ply === cache.ply + 1 &&
      state.lastMove &&
      cache.ids.length &&
      cache.ids[state.lastMove.from] !== null
    ) {
      const next = cache.ids.slice();
      next[state.lastMove.to] = next[state.lastMove.from];
      next[state.lastMove.from] = null;
      setCache({ ply: state.ply, ids: next });
    } else {
      setCache({ ply: state.ply, ids: buildIds(state.board) });
    }
  }
  return state.ply === cache.ply ? cache.ids : buildIds(state.board);
}

export function Board({ state, interaction, perspective, pending = false, disabled = false, showLegalMoves = true }: BoardProps) {
  const ids = usePieceIds(state);
  const { selected, validTargets, focusIndex, shaking, activate, registerCell, handleKeyDown } = interaction;
  const winning = new Set(state.winningLine ?? []);
  const gameOver = state.status !== "playing";
  const interactive = !disabled && !pending && !gameOver;
  const activeColor: Player | null = gameOver ? null : state.turn;
  const visibleTargets = showLegalMoves ? validTargets : [];

  const pieces = useMemo(
    () =>
      ids
        .map((id, cell) => (id === null ? null : { id, cell, player: state.board[cell]! }))
        .filter((p): p is { id: number; cell: number; player: Player } => p !== null)
        .sort((a, b) => a.id - b.id),
    [ids, state.board],
  );

  const line = state.winningLine;
  const lineGeometry = line
    ? { a: CELL_CENTER(line[0]), b: CELL_CENTER(line[2]) }
    : null;
  const lineLength = lineGeometry
    ? Math.hypot(lineGeometry.b.x - lineGeometry.a.x, lineGeometry.b.y - lineGeometry.a.y)
    : 0;

  return (
    <div
      className={`board-frame relative mx-auto aspect-square w-full p-[5%] transition-opacity ${pending ? "opacity-90" : ""}`}
      data-pending={pending}
    >
      <SketchGrid />
      <div
        role="grid"
        aria-label="Crossline board, three by three"
        aria-busy={pending}
        className="relative grid h-full w-full grid-cols-3 grid-rows-3 gap-[3%]"
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: BOARD_SIZE }, (_, row) => (
          <div key={row} role="row" className="contents">
            {Array.from({ length: BOARD_SIZE }, (_, col) => {
              const index = indexOf(row, col);
              const isSelected = selected === index;
              const isValid = visibleTargets.includes(index);
              const isWin = winning.has(index);
              const content = state.board[index];
              const ownPiece = content !== null && (perspective === null ? content === activeColor : content === perspective && content === activeColor);
              const clickable = interactive && (ownPiece || isValid || selected !== null || content !== null);
              return (
                <button
                  key={index}
                  ref={(el) => registerCell(index, el)}
                  type="button"
                  role="gridcell"
                  tabIndex={focusIndex === index ? 0 : -1}
                  aria-label={describe(state, index, isSelected, isValid, isWin)}
                  aria-selected={isSelected}
                  aria-disabled={!interactive}
                  onClick={() => activate(index)}
                  className={`group relative m-0 aspect-square w-full border-0 bg-transparent p-[3%] ${clickable ? "cursor-pointer" : "cursor-default"} ${shaking === index ? "animate-shake" : ""} focus-visible:outline-none`}
                >
                  <span
                    className="board-cell block h-full w-full group-focus-visible:ring-4 group-focus-visible:ring-x/70"
                    style={{ borderRadius: CELL_RADII[index] }}
                    data-valid={isValid}
                    data-win={isWin}
                    data-disabled={!interactive}
                    data-hover={interactive && (ownPiece || isValid)}
                  />
                  {isValid && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="valid-dot block h-[30%] w-[30%] rounded-full" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0">
          {pieces.map((piece) => (
            <Piece
              key={piece.id}
              player={piece.player}
              cell={piece.cell}
              selected={selected === piece.cell}
              winning={winning.has(piece.cell)}
              dimmed={!gameOver && piece.player !== activeColor}
              idle={!gameOver && piece.player === activeColor && selected === null && interactive}
              pending={pending && state.lastMove?.to === piece.cell}
            />
          ))}
        </div>

        {lineGeometry && (
          <svg
            aria-hidden="true"
            viewBox="0 0 300 300"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            {/* ink shadow echo, then the red pen stroke draws over it */}
            <line
              className="win-line-under"
              x1={lineGeometry.a.x}
              y1={lineGeometry.a.y + 4}
              x2={lineGeometry.b.x}
              y2={lineGeometry.b.y + 4}
              strokeWidth={16}
              strokeDasharray={lineLength}
              style={{ ["--line-length" as string]: lineLength }}
            />
            <line
              className="win-line"
              x1={lineGeometry.a.x}
              y1={lineGeometry.a.y}
              x2={lineGeometry.b.x}
              y2={lineGeometry.b.y}
              strokeWidth={9}
              strokeDasharray={lineLength}
              style={{ ["--line-length" as string]: lineLength }}
            />
          </svg>
        )}
      </div>
    </div>
  );
}
