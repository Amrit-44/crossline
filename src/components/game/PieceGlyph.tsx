import type { Player } from "@/game/types";

/**
 * Hand-drawn identity marks for Crossline.
 * Player 1 (red internally) plays X, Player 2 (blue internally) plays O.
 * Internal engine colours are preserved; only the presentation changes.
 * Each mark is deliberately imperfect: slightly wobbly strokes with an
 * ink overshoot, drawn like a quick pen sketch.
 */
export function PieceGlyph({ player, className = "" }: { player: Player; className?: string }) {
  if (player === "red") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round">
        {/* main strokes */}
        <path d="M8.5 8 Q 16 15.5, 23.8 23.6" strokeWidth="4.6" />
        <path d="M23.5 8.2 Q 16.2 15.8, 8.2 23.4" strokeWidth="4.6" />
        {/* ink texture: faint offset echo */}
        <path d="M9.5 7.4 Q 16.5 15, 24.2 22.6" strokeWidth="1.4" opacity="0.45" />
        <path d="M24.4 7.6 Q 16.8 15.2, 9 22.8" strokeWidth="1.4" opacity="0.45" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round">
      {/* imperfect loop with overshoot tail */}
      <path
        d="M16 6.5 Q 24.5 6.8, 25 15.5 Q 25.4 24, 16.5 25.4 Q 7.5 26.6, 7 17.5 Q 6.6 9.5, 15 7.2"
        strokeWidth="4.4"
      />
      <path
        d="M15 7.2 Q 20 6.2, 24 9"
        strokeWidth="1.4"
        opacity="0.45"
      />
    </svg>
  );
}

export const PLAYER_MARK: Record<Player, "X" | "O"> = { red: "X", blue: "O" };
export const PLAYER_LABEL: Record<Player, string> = { red: "X", blue: "O" };
