"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Button, LinkButton } from "@/components/ui/Button";
import type { Difficulty } from "@/game/bot";
import { useBoardInteraction, type RejectionFeedback } from "@/hooks/useBoardInteraction";
import { useOfflineGame } from "@/hooks/useOfflineGame";
import { loadIdentity, saveIdentity, AVATARS, NAME_MAX, isValidName, sanitizeName } from "@/lib/identity";
import { Avatar } from "@/components/identity/Avatar";
import { IdentitySetup } from "@/components/identity/IdentitySetup";
import { OnboardingGuide, isOnboarded } from "@/components/guide/OnboardingGuide";
import { Board } from "./Board";
import { Confetti } from "./Confetti";
import { GameOverModal } from "./GameOverModal";
import { PlayerPanel } from "./PlayerPanel";
import { GameShell } from "./GameShell";
import { TurnIndicator } from "./TurnIndicator";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard · Perfect" };

const REJECTION_COPY: Partial<Record<RejectionFeedback, string>> = {
  "not-your-piece": "That's your opponent's piece.",
  "destination-occupied": "That cell is taken.",
  "not-adjacent": "Pieces move one step in any direction.",
  locked: "Hold on — it's not your turn.",
};

interface OfflineGameProps {
  bot: Difficulty | null;
}

type Phase = "setup" | "guide" | "match";

export function OfflineGame({ bot }: OfflineGameProps) {
  const router = useRouter();
  const { play, settings } = useSettings();
  const { show } = useToast();
  const game = useOfflineGame(bot);
  const { state, thinking, score, gameNumber, humanSeat, canAct } = game;
  const resultKey = state.status === "playing" ? null : `game-${gameNumber}`;
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const resultOpen = resultKey !== null && shownKey === resultKey && dismissedKey !== resultKey;
  const closeResult = () => setDismissedKey(resultKey);

  const [phase, setPhase] = useState<Phase>("setup");
  const [identity, setIdentity] = useState(() => loadIdentity());
  const [rivalName, setRivalName] = useState(bot ? "" : "Rival");
  const [rivalAvatar, setRivalAvatar] = useState("halo");
  // No reset-on-[bot]-change effect needed: BotGameClient remounts this
  // component via key={difficulty} whenever the difficulty changes.

  const redName = useMemo(() => {
    if (bot) return identity.name || "You";
    return identity.name || "Player 1 (X)";
  }, [bot, identity.name]);
  const blueName = useMemo(() => {
    if (bot) return `Bot · ${DIFFICULTY_LABEL[bot]}`;
    return rivalName || "Player 2 (O)";
  }, [bot, rivalName]);

  const startMatch = (id: { name: string; avatar: string }, rival?: { name: string; avatar: string }) => {
    setIdentity(id);
    saveIdentity(id);
    if (rival) {
      setRivalName(rival.name);
      setRivalAvatar(rival.avatar);
    }
    play("start");
    setPhase(isOnboarded() ? "match" : "guide");
  };

  const interaction = useBoardInteraction({
    state,
    canAct: phase === "match" && canAct,
    onMove: (move) => game.makeMove(move),
    onSelect: () => play("select"),
    onReject: (reason) => {
      if (state.status !== "playing") return;
      play("invalid");
      const copy = REJECTION_COPY[reason];
      if (copy) show(copy, "error");
    },
  });

  // Let the winning-line animation land before the result card appears.
  useEffect(() => {
    if (!resultKey) return;
    const timer = window.setTimeout(() => setShownKey(resultKey), 1100);
    return () => window.clearTimeout(timer);
  }, [resultKey]);

  const modeLabel = bot ? `vs Bot · ${DIFFICULTY_LABEL[bot]}` : "Local 2P";
  const gameOver = state.status !== "playing";

  if (phase === "setup") {
    return (
      <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-4 py-10">
        <p className="hand rotate-[-2deg] border-2 border-dashed border-ink px-3 py-1 text-xl font-bold text-ink-soft">{bot ? "sharpen your pencil…" : "prepare the duel…"}</p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">Set up your match</h1>
        <div className="mt-6 w-full">
          {bot ? (
            <IdentitySetup
              initialName={identity.name}
              initialAvatar={identity.avatar}
              submitLabel="Start match"
              onSubmit={(id) => startMatch(id)}
            />
          ) : (
            <LocalSetup
              initialName={identity.name}
              initialAvatar={identity.avatar}
              onSubmit={(a, b) => startMatch(a, b)}
            />
          )}
        </div>
        <div className="mt-4">
          <LinkButton href="/" variant="ghost" size="sm">Back to menu</LinkButton>
        </div>
      </main>
    );
  }

  if (phase === "guide") {
    return (
      <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center px-4 py-10">
        <OnboardingGuide onDone={() => setPhase("match")} />
      </main>
    );
  }

  return (
    <GameShell
      modeLabel={modeLabel}
      red={
        <PlayerPanel
          player="red"
          name={redName}
          avatar={bot ? identity.avatar : identity.avatar}
          active={!gameOver && state.turn === "red"}
          status={`Wins: ${score.red}`}
          isYou={humanSeat === "red"}
        />
      }
      blue={
        <PlayerPanel
          player="blue"
          name={blueName}
          avatar={bot ? undefined : rivalAvatar}
          active={!gameOver && state.turn === "blue"}
          status={thinking ? "Thinking…" : `Wins: ${score.blue}`}
        />
      }
      footer={
        <>
          <Button variant="gold" size="lg" onClick={() => { play("rematch"); game.reset(); }}>
            {gameOver ? "Rematch" : "New Game"}
          </Button>
          <LinkButton href="/" variant="neutral" size="lg">Exit</LinkButton>
        </>
      }
    >
      <TurnIndicator state={state} redName={redName} blueName={blueName} thinking={thinking} />
      <div className="relative w-full">
        {state.status === "won" && <Confetti seed={gameNumber * 31 + state.ply} />}
        <Board state={state} interaction={interaction} perspective={humanSeat} disabled={!canAct && !gameOver} showLegalMoves={settings.showLegalMoves} />
      </div>
      <p className="text-xs font-semibold text-ink-muted">
        Game {gameNumber} · {score.red}–{score.blue}{score.draws ? ` · ${score.draws} drawn` : ""}
      </p>

      <GameOverModal
        open={resultOpen}
        state={state}
        redName={redName}
        blueName={blueName}
        redAvatar={bot ? identity.avatar : identity.avatar}
        blueAvatar={bot ? undefined : rivalAvatar}
        onClose={closeResult}
        actions={
          <>
            <Button variant="gold" size="lg" onClick={() => { play("rematch"); closeResult(); game.reset(); }}>Rematch</Button>
            <Button variant="neutral" onClick={() => { play("click"); closeResult(); }}>View board</Button>
            <Button variant="ghost" onClick={() => router.push("/")}>Main menu</Button>
          </>
        }
      />
    </GameShell>
  );
}

function LocalSetup({
  initialName,
  initialAvatar,
  onSubmit,
}: {
  initialName: string;
  initialAvatar: string;
  onSubmit: (a: { name: string; avatar: string }, b: { name: string; avatar: string }) => void;
}) {
  const [nameA, setNameA] = useState(initialName);
  const [avatarA, setAvatarA] = useState(initialAvatar);
  const [nameB, setNameB] = useState("");
  const [avatarB, setAvatarB] = useState("halo");
  const valid = isValidName(nameA) && isValidName(nameB);

  const picker = (
    label: string,
    name: string,
    setName: (v: string) => void,
    avatar: string,
    setAvatar: (v: string) => void,
    mark: string,
  ) => (
    <div className="flex-1">
      <p className="mb-2 text-center font-display text-sm font-black tracking-widest text-ink-soft">
        {label} · <span className="text-x">{mark}</span>
      </p>
      <div className="flex justify-center">
        <Avatar id={avatar} size={56} />
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={`${label} avatar ${a.label}`}
            aria-pressed={avatar === a.id}
            onClick={() => setAvatar(a.id)}
            className={`flex aspect-square items-center justify-center rounded-lg border ${avatar === a.id ? "border-x" : "border-line bg-bg-soft"}`}
          >
            <Avatar id={a.id} size={24} label={a.label} />
          </button>
        ))}
      </div>
      <input
        className="input mt-2 min-h-11 text-base"
        value={name}
        maxLength={NAME_MAX}
        placeholder={label}
        aria-label={`${label} name`}
        autoComplete="nickname"
        enterKeyHint="next"
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );

  return (
    <div className="card sticker mx-auto w-full max-w-lg p-6">
      <h2 className="display text-center text-4xl">Choose your rivals</h2>
      <p className="mt-1 text-center text-sm font-semibold text-ink-soft">X moves first · names stay on this device</p>
      <div className="mt-5 flex flex-col items-stretch gap-5 min-[440px]:flex-row min-[440px]:items-start min-[440px]:gap-3">
        {picker("Player 1", nameA, setNameA, avatarA, setAvatarA, "X")}
        <span aria-hidden className="hand shrink-0 rotate-[-6deg] self-center text-3xl font-bold text-x">vs</span>
        {picker("Player 2", nameB, setNameB, avatarB, setAvatarB, "O")}
      </div>
      {!valid && <p className="mt-3 text-center text-xs font-semibold text-error">Both names need 2–16 characters.</p>}
      <button
        type="button"
        disabled={!valid}
        onClick={() => onSubmit({ name: sanitizeName(nameA), avatar: avatarA }, { name: sanitizeName(nameB), avatar: avatarB })}
        className="btn btn-play mt-4 min-h-12 w-full text-lg"
      >
        Start match
      </button>
    </div>
  );
}
