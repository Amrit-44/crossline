import { colOf, rowOf } from "@/game/board";
import type { Player } from "@/game/types";
import { PieceGlyph } from "./PieceGlyph";

interface PieceProps {
  player: Player;
  cell: number;
  selected: boolean;
  winning: boolean;
  dimmed: boolean;
  idle: boolean;
  pending: boolean;
}

/** Purely visual; the interactive/accessible surface is the Cell button beneath. */
export function Piece({ player, cell, selected, winning, dimmed, idle, pending }: PieceProps) {
  return (
    <div
      aria-hidden="true"
      className="piece pointer-events-none absolute left-0 top-0 h-1/3 w-1/3 p-[4.33%]"
      style={{ transform: `translate(${colOf(cell) * 100}%, ${rowOf(cell) * 100}%)` }}
      data-selected={selected}
      data-win={winning}
      data-dim={dimmed}
      data-idle={idle}
      data-pending={pending}
    >
      <div key={cell} className="piece-token piece-settle flex h-full w-full items-center justify-center" data-color={player}>
        <PieceGlyph player={player} className="relative z-10 h-[46%] w-[46%]" />
      </div>
    </div>
  );
}
