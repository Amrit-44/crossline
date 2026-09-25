"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/SettingsProvider";
import { BOT_THINK_DELAY_MS, chooseBotMove, type Difficulty } from "@/game/bot";
import { applyMove, createInitialState } from "@/game/rules";
import type { GameState, Move, Player } from "@/game/types";

export interface Score { red: number; blue: number; draws: number }

const BOT_SEAT: Player = "blue";

/**
 * Drives Local (two humans) and vs-Bot games on one device. All rule checks
 * come from the engine; this hook only sequences turns and side effects.
 */
export function useOfflineGame(bot: Difficulty | null) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [score, setScore] = useState<Score>({ red: 0, blue: 0, draws: 0 });
  const [gameNumber, setGameNumber] = useState(1);
  const stateRef = useRef(state);
  const generation = useRef(0);
  const { play } = useSettings();

  const humanSeat: Player | null = bot ? "red" : null;
  /** The bot "thinks" for the whole of its turn; the timer below ends it. */
  const thinking = bot !== null && state.status === "playing" && state.turn === BOT_SEAT;
  const canAct =
    state.status === "playing" && !thinking && (humanSeat === null || state.turn === humanSeat);

  const commit = useCallback(
    (next: GameState) => {
      stateRef.current = next;
      setState(next);
      if (next.status === "won") {
        play("win");
        setScore((s) => ({ ...s, [next.winner!]: s[next.winner!] + 1 }));
      } else if (next.status === "draw") {
        play("draw");
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
      }
    },
    [play],
  );

  const makeMove = useCallback(
    (move: Move): boolean => {
      const result = applyMove(stateRef.current, move);
      if (!result.ok) return false;
      play("move");
      commit(result.state);
      return true;
    },
    [commit, play],
  );

  useEffect(() => {
    if (!bot || state.status !== "playing" || state.turn !== BOT_SEAT) return;
    const gen = generation.current;
    const delay = BOT_THINK_DELAY_MS.min + Math.random() * (BOT_THINK_DELAY_MS.max - BOT_THINK_DELAY_MS.min);
    const timer = window.setTimeout(() => {
      if (gen !== generation.current) return;
      const move = chooseBotMove(state, bot);
      if (!move) return;
      const result = applyMove(state, move);
      if (result.ok) {
        play("bot");
        commit(result.state);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [bot, state, commit, play]);

  const reset = useCallback(() => {
    generation.current += 1;
    const fresh = createInitialState();
    stateRef.current = fresh;
    setState(fresh);
    setGameNumber((n) => n + 1);
  }, []);

  return { state, thinking, score, gameNumber, humanSeat, canAct, makeMove, reset };
}
