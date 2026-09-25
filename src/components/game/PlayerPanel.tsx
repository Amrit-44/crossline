import type { Player } from "@/game/types";
import { Avatar } from "@/components/identity/Avatar";
import { PieceGlyph } from "./PieceGlyph";
import { PLAYER_MARK } from "./PieceGlyph";

export type PresenceState = "connected" | "disconnected" | "waiting" | "left" | null;

interface PlayerPanelProps {
  player: Player;
  name: string;
  active: boolean;
  status?: string;
  presence?: PresenceState;
  countdownSeconds?: number | null;
  isYou?: boolean;
  avatar?: string;
}

/** Compact chip on small screens, full card from `lg` up. */
export function PlayerPanel({ player, name, active, status, presence = null, countdownSeconds, isYou, avatar }: PlayerPanelProps) {
  const mark = PLAYER_MARK[player];
  return (
    <section
      aria-label={`${mark} player: ${name}${active ? ", to move" : ""}`}
      className={`card relative flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 transition-all duration-200 lg:w-full lg:flex-none lg:p-4 ${
        active ? "-rotate-[0.6deg] outline outline-[3px] outline-x" : "rotate-[0.4deg] opacity-90"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="hand absolute -top-4 right-3 rotate-3 bg-x px-2 py-0.5 text-base font-bold leading-none text-paper"
        >
          your turn!
        </span>
      )}
      {avatar ? (
        <Avatar id={avatar} size={36} label={`${name} avatar`} />
      ) : (
        <div className="piece-token flex h-9 w-9 shrink-0 items-center justify-center lg:h-12 lg:w-12" data-color={player}>
          <PieceGlyph player={player} className="relative z-10 h-1/2 w-1/2" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-extrabold leading-tight lg:text-base">{name}</p>
          {isYou && <span className="border border-ink bg-surface-2 px-1.5 py-0.5 font-hand text-sm font-bold leading-none text-ink-soft">you</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`px-2 py-0.5 font-display text-base leading-none ${player === "red" ? "chip-red" : "chip-blue"}`}>{mark}</span>
          {presence === "connected" && (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />Online</span>
          )}
          {presence === "disconnected" && (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-error">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-error" aria-hidden />
              Reconnecting{countdownSeconds != null ? ` · ${countdownSeconds}s` : "…"}
            </span>
          )}
          {presence === "waiting" && <span className="hand text-lg font-bold leading-none text-ink-muted">waiting…</span>}
          {presence === "left" && <span className="text-[11px] font-extrabold text-ink-muted">Left</span>}
        </div>
        {status && <p className="mt-1 hidden text-xs font-semibold text-ink-soft lg:block">{status}</p>}
      </div>
    </section>
  );
}
