import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Play Crossline — Bot, Local & Online Modes",
  description: "Choose your Crossline mode: vs Bot, Local 2 player, or Online multiplayer.",
};

const MODES = [
  { href: "/bot", mark: "X", title: "Play vs Bot", copy: "Easy for learning, Medium for a fight, Hard plays perfectly from the solved game table.", cta: "Choose difficulty" },
  { href: "/local", mark: "O", title: "Local 2 Player", copy: "Two people, one device. Set names and avatars, then battle over the board.", cta: "Start local match" },
  { href: "/online", mark: "⇄", title: "Online Multiplayer", copy: "Create a room, share the 5-letter code, and play a server-validated match.", cta: "Create or join room" },
];

export default function PlayPage() {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <Link href="/" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Menu</Link>
      <p className="hand text-2xl font-bold uppercase tracking-[0.25em] text-x">Game modes</p>
      <h1 className="display mt-1 text-5xl sm:text-6xl">Choose your arena</h1>
      <p className="mt-2 max-w-xl font-semibold text-ink-soft">Three ways to play the same pure game — one engine, server-validated online.</p>
      <div className="mt-8 grid gap-4">
        {MODES.map((m, i) => (
          <Link key={m.href} href={m.href} className={`card animate-pop-in flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-x/40 ${i === 1 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]"}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="piece-token flex h-14 w-14 shrink-0 items-center justify-center font-display text-3xl" data-color={i === 1 ? "blue" : "red"} aria-hidden>{m.mark}</span>
            <span className="min-w-0">
              <span className="display block text-3xl">{m.title}</span>
              <span className="mt-1 block text-sm font-semibold text-ink-soft">{m.copy}</span>
              <span className="mt-2 inline-block font-hand text-xl font-bold text-x">{m.cta} →</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
