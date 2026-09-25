"use client";

import { useCallback, useState } from "react";
import { createInitialState, applyMove } from "@/game/rules";
import type { GameState } from "@/game/types";
import { Board } from "@/components/game/Board";
import { useBoardInteraction } from "@/hooks/useBoardInteraction";

const STORAGE_KEY = "crossline:onboarded:v1";

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

const STEPS = [
  {
    title: "You control three pieces",
    body: "You play X (first) or O (second). All three of your marks start on your side column.",
  },
  {
    title: "Move one piece one square",
    body: "On your turn, tap one of your pieces, then tap a highlighted empty square next to it.",
  },
  {
    title: "Move any direction",
    body: "Horizontally, vertically, or diagonally — any adjacent empty square is a legal move.",
  },
  {
    title: "Line them up",
    body: "Get all three of your pieces into a straight row, column, or diagonal. Your starting column doesn't count.",
  },
  {
    title: "Win before your rival",
    body: "The first player to complete a valid line wins. If a position repeats three times, it's a draw.",
  },
];

/** Interactive mini-board used inside the onboarding guide (local demo state). */
function DemoBoard({ step }: { step: number }) {
  const [state, setState] = useState<GameState>(() => {
    if (step >= 3) {
      // Show a near-win to illustrate the goal: X at 3,4 with 5 empty.
      const s = createInitialState();
      const board = [...s.board];
      // Move X 0->1 then 3->4 style demo: craft manually
      board[0] = null; board[1] = "red";
      return { ...s, board };
    }
    return createInitialState();
  });
  const interaction = useBoardInteraction({
    state,
    canAct: step === 1 || step === 2,
    onMove: (m) => {
      const r = applyMove(state, m);
      if (r.ok) setState(r.state);
    },
  });
  return <Board state={state} interaction={interaction} perspective={null} />;
}

export function OnboardingGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const finish = useCallback(() => {
    markOnboarded();
    onDone();
  }, [onDone]);

  return (
    <div className="card mx-auto w-full max-w-lg p-6 sm:p-8" role="dialog" aria-modal="true" aria-label="How to play Crossline">
      <p className="text-xs font-black uppercase tracking-widest text-x">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className="display mt-1 text-3xl">{STEPS[step].title}</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">{STEPS[step].body}</p>

      <div className="mt-4">
        <DemoBoard key={step} step={step} />
      </div>

      <div className="mt-4 flex items-center gap-2" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-x" : "bg-line"}`} />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost min-h-11 px-4 text-sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Previous
        </button>
        <button type="button" className="btn btn-ghost min-h-11 px-4 text-sm" onClick={finish}>
          Skip
        </button>
        {!last ? (
          <button type="button" className="btn btn-play min-h-11 flex-1 text-base" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-play min-h-11 flex-1 text-base" onClick={finish}>
            Got it — Start Game
          </button>
        )}
      </div>
    </div>
  );
}
