import type { GameState } from "@/game/types";
import { PieceGlyph, PLAYER_MARK } from "./PieceGlyph";

interface TurnIndicatorProps {
  state: GameState;
  redName: string;
  blueName: string;
  thinking?: boolean;
  pending?: boolean;
  extra?: string | null;
}

export function TurnIndicator({ state, redName, blueName, thinking, pending, extra }: TurnIndicatorProps) {
  const name = state.turn === "red" ? redName : blueName;
  const mark = PLAYER_MARK[state.turn];
  let text: string;
  let tone = "card-flat px-4 py-1.5";
  if (state.status === "won") {
    text = `LINE COMPLETE — ${state.winner === "red" ? redName : blueName} wins`;
    tone = "border-2 border-x bg-red-soft px-4 py-1.5";
  } else if (state.status === "draw") {
    text = state.drawReason === "repetition" ? "DRAW — same position, no progress" : "DRAW";
    tone = "card-flat px-4 py-1.5";
  } else if (pending) {
    text = "Syncing move…";
  } else if (thinking) {
    text = `${name} is thinking`;
  } else {
    text = extra ?? `${name}'s turn`;
  }

  return (
    <div className="flex min-h-10 items-center justify-center" aria-live="polite" aria-atomic="true">
      <div
        key={`${state.turn}-${state.status}-${thinking}-${pending}`}
        className={`animate-turn-flip inline-flex rotate-[-0.5deg] items-center gap-2 text-sm font-extrabold tracking-wide ${tone}`}
      >
        {state.status === "playing" && !thinking && !pending && (
          <span className="piece-token flex h-6 w-6 items-center justify-center" data-color={state.turn} aria-hidden>
            <PieceGlyph player={state.turn} className="h-3.5 w-3.5" />
          </span>
        )}
        {state.status !== "playing" && <span aria-hidden>{state.status === "won" ? "✎" : "="}</span>}
        <span>
          {state.status === "playing" && !thinking && !pending ? (
            <>
              <span className="hand mr-1 text-lg font-bold text-x">{mark}</span>
              {text}
            </>
          ) : (
            text
          )}
        </span>
        {(thinking || pending) && (
          <span className="ml-0.5 inline-flex gap-0.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="animate-dots inline-block h-1.5 w-1.5 rounded-full bg-current" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
