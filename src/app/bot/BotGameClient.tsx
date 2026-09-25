"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { OfflineGame } from "@/components/game/OfflineGame";
import { DIFFICULTIES, type Difficulty } from "@/game/bot";
import { useSettings } from "@/components/providers/SettingsProvider";

const OPTIONS: { value: Difficulty; title: string; copy: string; badge: string }[] = [
  { value: "easy", title: "Easy", copy: "Plays random legal moves. Great for learning the board.", badge: "Learn" },
  { value: "medium", title: "Medium", copy: "Takes wins, blocks threats, avoids obvious blunders.", badge: "Spar" },
  { value: "hard", title: "Hard · Perfect", copy: "Solved-table perfect play. It cannot lose — can you hold the draw?", badge: "Solved" },
];

const isDifficulty = (v: string | null): v is Difficulty => DIFFICULTIES.includes(v as Difficulty);

export function BotGameClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { play } = useSettings();
  const chosen = params.get("d");

  if (isDifficulty(chosen)) return <OfflineGame key={chosen} bot={chosen} />;

  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-10">
      <Link href="/play" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Modes</Link>
      <p className="hand text-2xl font-bold uppercase tracking-[0.2em] text-x">Vs Bot · you play X first</p>
      <h1 className="display mt-1 text-5xl sm:text-6xl">How smart should they be?</h1>
      <p className="mt-2 font-semibold text-ink-soft">Hard plays perfectly from the solved table — it cannot lose. Can you hold the draw?</p>
      <div className="mt-6 grid gap-3">
        {OPTIONS.map((option, i) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { play("click"); router.push(`/bot?d=${option.value}`); }}
            className="card animate-pop-in flex items-center gap-4 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-x/40 active:translate-y-0"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="piece-token flex h-14 w-14 shrink-0 items-center justify-center font-display text-2xl" data-color={i === 2 ? "red" : "blue"} aria-hidden>{option.title[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="display block text-3xl">{option.title}</span>
              <span className="block text-sm font-semibold text-ink-soft">{option.copy}</span>
            </span>
            <span className="hand rotate-3 border-2 border-dashed border-ink px-2 py-0.5 text-lg font-bold leading-none text-ink-soft">{option.badge}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
