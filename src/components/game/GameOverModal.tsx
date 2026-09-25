"use client";

import type { ReactNode } from "react";
import type { GameState } from "@/game/types";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/identity/Avatar";
import { DoodleStar, DoodleUnderline } from "@/components/doodle/Doodles";
import { PieceGlyph, PLAYER_MARK } from "./PieceGlyph";

interface GameOverModalProps {
  open: boolean;
  state: GameState;
  redName: string;
  blueName: string;
  redAvatar?: string;
  blueAvatar?: string;
  subtitle?: string;
  actions: ReactNode;
  onClose?: () => void;
}

const WIN_COPY = [
  "Three in a row. Clean pen stroke.",
  "Saw the opening, took the line.",
  "Patient defense, then the strike.",
];

export function GameOverModal({ open, state, redName, blueName, redAvatar, blueAvatar, subtitle, actions, onClose }: GameOverModalProps) {
  const winner = state.winner;
  const title = winner ? "LINE COMPLETE" : "DRAW";
  const copy =
    subtitle ??
    (winner
      ? WIN_COPY[state.ply % WIN_COPY.length]
      : state.drawReason === "repetition"
        ? "Same position. No progress. Neither side could force the finish — take the rematch."
        : "No legal moves left. Nobody blinks, nobody wins.");
  const winnerName = winner ? (winner === "red" ? redName : blueName) : null;
  const winnerAvatar = winner === "red" ? redAvatar : winner === "blue" ? blueAvatar : undefined;

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        {winner && (
          <DoodleStar className="animate-wiggle mb-2 h-8 w-8 text-gold" />
        )}
        {winner ? (
          <div className="mb-4 flex flex-col items-center gap-2">
            {winnerAvatar ? (
              <Avatar id={winnerAvatar} size={64} label={`${winnerName} avatar`} />
            ) : (
              <div className="piece-token flex h-20 w-20 rotate-[-3deg] items-center justify-center" data-color={winner}>
                <PieceGlyph player={winner} className="relative z-10 h-10 w-10" />
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-3">
            {redAvatar ? <Avatar id={redAvatar} size={52} /> : (
              <div className="piece-token flex h-14 w-14 rotate-[-4deg] items-center justify-center" data-color="red"><PieceGlyph player="red" className="relative z-10 h-6 w-6" /></div>
            )}
            <span className="hand text-3xl font-bold text-ink-muted">vs</span>
            {blueAvatar ? <Avatar id={blueAvatar} size={52} /> : (
              <div className="piece-token flex h-14 w-14 rotate-[4deg] items-center justify-center" data-color="blue"><PieceGlyph player="blue" className="relative z-10 h-6 w-6" /></div>
            )}
          </div>
        )}
        <h2 className={`display text-5xl sm:text-6xl ${winner ? "text-x" : "text-ink"}`}>{title}</h2>
        <DoodleUnderline className={`mt-1 h-3 w-44 ${winner ? "text-x" : "text-ink-muted"}`} />
        {winnerName && (
          <p className="mt-2 text-lg font-extrabold text-ink">
            <span className="hand mr-1 text-2xl font-bold text-x">{PLAYER_MARK[winner!]}</span>
            {winnerName} takes it
          </p>
        )}
        {state.winningLine && winner && (
          <p className="mt-1 font-hand text-lg font-semibold leading-none text-ink-muted">
            line: {state.winningLine.map((c) => `R${Math.floor(c / 3) + 1}C${(c % 3) + 1}`).join(" · ")}
          </p>
        )}
        <p className="mt-2 max-w-xs text-sm font-semibold text-ink-soft">{copy}</p>
        <div className="mt-6 flex w-full flex-col gap-2.5">{actions}</div>
      </div>
    </Modal>
  );
}
