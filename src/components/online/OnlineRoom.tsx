"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Board } from "@/components/game/Board";
import { Confetti } from "@/components/game/Confetti";
import { GameOverModal } from "@/components/game/GameOverModal";
import { GameShell } from "@/components/game/GameShell";
import { PlayerPanel, type PresenceState } from "@/components/game/PlayerPanel";
import { TurnIndicator } from "@/components/game/TurnIndicator";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { otherPlayer } from "@/game/board";
import { createInitialState } from "@/game/rules";
import { useBoardInteraction, type RejectionFeedback } from "@/hooks/useBoardInteraction";
import { useCrosslineRoom } from "@/hooks/useCrosslineRoom";
import type { PlayerView, RoomSnapshot } from "@/realtime/protocol";
import type { ConnectionState } from "@/realtime/client";
import { Chat } from "./Chat";
import { JoinCard } from "./JoinCard";
import { WaitingRoom } from "./WaitingRoom";

const FALLBACK_STATE = createInitialState();

const REJECTION_COPY: Partial<Record<RejectionFeedback, string>> = {
  "not-your-piece": "That's your opponent's piece.",
  "destination-occupied": "That cell is taken.",
  "not-adjacent": "Pieces move one step in any direction.",
  locked: "Not your turn.",
};

const presenceOf = (player: PlayerView | null, status: RoomSnapshot["status"]): PresenceState => {
  if (!player) return "waiting";
  if (player.left) return "left";
  if (status === "finished" || status === "expired") return player.connected ? "connected" : null;
  return player.connected ? "connected" : "disconnected";
};

function CenteredCard({ title, body, action }: { title: string; body: string; action: { href: string; label: string } }) {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <div className="card w-full p-8">
        <h1 className="display text-4xl">{title}</h1>
        <p className="mt-3 font-semibold text-ink-soft">{body}</p>
        <Link href={action.href} className="btn btn-gold mt-6 min-h-12 w-full px-5">{action.label}</Link>
      </div>
    </main>
  );
}

function ConnectionBadge({ connection, onRetry }: { connection: ConnectionState; onRetry: () => void }) {
  if (connection === "connected") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-soft px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-ink-soft">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-play">●</span> Connected
      </span>
    );
  }
  if (connection === "reconnecting" || connection === "connecting") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-warning">
        <span aria-hidden className="animate-dots inline-block">↻</span> Reconnecting…
      </span>
    );
  }
  return (
    <span role="alert" className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-error">
      <span aria-hidden>○</span> Disconnected
      <button type="button" onClick={onRetry} className="underline underline-offset-2">Retry</button>
    </span>
  );
}

export function OnlineRoom({ code }: { code: string }) {
  const router = useRouter();
  const { play, settings } = useSettings();
  const { show } = useToast();
  const room = useCrosslineRoom(code);
  const { view, game, pending, lastError, clearError, connection } = room;
  const reconnecting = connection === "reconnecting" || connection === "connecting";
  const [rematchBusy, setRematchBusy] = useState(false);
  const status = game?.status ?? "playing";
  const resultKey = status === "playing" || !view ? null : `game-${view.gamesPlayed}`;
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const resultOpen = resultKey !== null && shownKey === resultKey && dismissedKey !== resultKey;
  const closeResult = () => setDismissedKey(resultKey);

  useEffect(() => {
    if (!lastError || room.phase === "expired") return;
    show(lastError.message, "error");
    clearError();
  }, [lastError, room.phase, show, clearError]);

  useEffect(() => {
    if (!resultKey) return;
    const timer = window.setTimeout(() => setShownKey(resultKey), 1100);
    return () => window.clearTimeout(timer);
  }, [resultKey]);

  const seat = view?.seat ?? "red";
  const gameOver = !!game && game.status !== "playing";
  const canAct = !!game && !!view && view.status === "active" && game.turn === seat && !pending && connection === "connected";

  const interaction = useBoardInteraction({
    state: game ?? FALLBACK_STATE,
    canAct,
    onMove: (move) => void room.move(move),
    onSelect: () => play("select"),
    onReject: (reason) => {
      if (!game || game.status !== "playing") return;
      play("invalid");
      const copy = REJECTION_COPY[reason];
      if (copy) show(copy, "error");
    },
  });

  if (room.phase === "no-session") {
    return <JoinCard code={code} onJoin={room.join} />;
  }
  if (room.phase === "expired") {
    return (
      <CenteredCard
        title="Session expired"
        body={lastError?.message ?? "This room is no longer available. Start a new game."}
        action={{ href: "/online", label: "Back to lobby" }}
      />
    );
  }
  if (room.phase === "loading" || !view || !game) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true">
        <div className="flex gap-1.5" role="status" aria-label="Connecting to room">
          {[0, 1, 2].map((i) => <span key={i} className="animate-dots block h-3 w-3 rounded-full bg-ink-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
        <ConnectionBadge connection={connection} onRetry={room.retry} />
      </main>
    );
  }
  if (view.status === "expired") {
    return <CenteredCard title="Room expired" body="Nobody joined in time, or the host left. Start a fresh room." action={{ href: "/online", label: "Back to lobby" }} />;
  }
  if (view.status === "waiting") {
    return (
      <>
        <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2">
          <ConnectionBadge connection={connection} onRetry={room.retry} />
        </div>
        <WaitingRoom
          code={code}
          name={view.players.red?.name ?? view.players.blue?.name ?? "Player"}
          onCancel={async () => {
            await room.leave();
            router.push("/online");
          }}
        />
      </>
    );
  }

  const me = view.players[seat];
  const opponentSeat = otherPlayer(seat);
  const opponent = view.players[opponentSeat];
  const redName = view.players.red?.name ?? "Waiting for X…";
  const blueName = view.players.blue?.name ?? "Waiting for O…";
  const opponentPresence = presenceOf(opponent, view.status);
  const countdown = opponent?.forfeitInMs != null ? Math.ceil(opponent.forfeitInMs / 1000) : null;

  const banner = reconnecting ? (
    <div role="status" className="animate-pop-in rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-center text-sm font-bold text-warning">
      Reconnecting… your seat is held for 30 seconds.
    </div>
  ) : opponentPresence === "disconnected" ? (
    <div role="status" className="animate-pop-in rounded-xl border border-error/40 bg-error/10 px-4 py-2.5 text-center text-sm font-bold text-error">
      Opponent disconnected. Holding their seat{countdown != null ? ` — ${countdown}s` : ""}…
    </div>
  ) : null;

  const finishSubtitle =
    view.finishReason === "forfeit-disconnect"
      ? view.forfeitedBy === seat ? "You didn't reconnect in time." : "Your opponent didn't reconnect in time."
      : view.finishReason === "forfeit-left"
        ? view.forfeitedBy === seat ? "You left the game." : "Your opponent left the game."
        : undefined;

  const opponentGone = !opponent || opponent.left;
  const rematch = async () => {
    play("rematch");
    setRematchBusy(true);
    await room.rematch();
    setRematchBusy(false);
  };
  const rematchLabel = opponentGone
    ? "Opponent left"
    : me?.wantsRematch
      ? "Waiting for opponent…"
      : opponent?.wantsRematch
        ? "Accept rematch"
        : "Rematch";

  const exit = async () => {
    await room.leave();
    router.push("/online");
  };

  return (
    <GameShell
      modeLabel={`Online · ${code}`}
      onExit={() => void room.leave()}
      banner={banner}
      red={
        <PlayerPanel
          player="red"
          name={redName}
          active={!gameOver && game.turn === "red"}
          isYou={seat === "red"}
          presence={seat === "red" ? (reconnecting ? "disconnected" : "connected") : opponentPresence}
          countdownSeconds={seat === "red" ? null : countdown}
        />
      }
      blue={
        <PlayerPanel
          player="blue"
          name={blueName}
          active={!gameOver && game.turn === "blue"}
          isYou={seat === "blue"}
          presence={seat === "blue" ? (reconnecting ? "disconnected" : "connected") : opponentPresence}
          countdownSeconds={seat === "blue" ? null : countdown}
        />
      }
      aside={<Chat messages={view.messages} seat={seat} onSend={room.chat} disabled={opponentGone && view.status !== "active"} />}
      footer={
        <>
          <div className="flex w-full justify-center">
            <ConnectionBadge connection={connection} onRetry={room.retry} />
          </div>
          {gameOver && (
            <Button variant="gold" size="lg" onClick={rematch} disabled={opponentGone || me?.wantsRematch || rematchBusy}>
              {rematchLabel}
            </Button>
          )}
          <Button variant="neutral" size="lg" onClick={exit}>Exit</Button>
        </>
      }
    >
      <TurnIndicator
        state={game}
        redName={redName}
        blueName={blueName}
        pending={pending}
        extra={game.turn === seat ? "Your turn" : null}
      />
      <div className="relative w-full">
        {game.status === "won" && game.winner === seat && <Confetti seed={view.gamesPlayed * 17 + game.ply} />}
        <Board state={game} interaction={interaction} perspective={seat} pending={pending} disabled={!canAct && !gameOver} showLegalMoves={settings.showLegalMoves} />
      </div>
      <p className="text-xs font-bold text-ink-muted">Game {view.gamesPlayed + 1} · Room {code}</p>

      <GameOverModal
        open={resultOpen}
        state={game}
        redName={redName}
        blueName={blueName}
        subtitle={finishSubtitle}
        onClose={closeResult}
        actions={
          <>
            <Button variant="gold" size="lg" onClick={rematch} disabled={opponentGone || me?.wantsRematch || rematchBusy}>
              {rematchLabel}
            </Button>
            {opponent?.wantsRematch && !me?.wantsRematch && (
              <p className="text-xs font-bold text-play-deep">{opponent.name} wants a rematch!</p>
            )}
            <Button variant="neutral" onClick={closeResult}>View board</Button>
            <Button variant="ghost" onClick={exit}>Leave room</Button>
          </>
        }
      />
    </GameShell>
  );
}
