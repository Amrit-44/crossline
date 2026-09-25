import type { Metadata } from "next";
import Link from "next/link";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DoodleScribble, DoodleUnderline } from "@/components/doodle/Doodles";

export const metadata: Metadata = {
  title: "About Crossline",
  description: "What Crossline is: a fast 1v1 tactical board game for quick matches.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="animate-rise-in mx-auto flex w-full max-w-3xl flex-col px-5 py-8">
        <p className="hand text-2xl font-bold uppercase tracking-[0.25em] text-x">About</p>
        <h1 className="display mt-1 text-5xl sm:text-6xl">Small rules, deep decisions.</h1>
        <DoodleUnderline className="mt-1 h-3 w-52 text-x" />
        <div className="card sticker mt-8 space-y-4 p-6 text-[15px] font-semibold leading-relaxed text-ink-soft sm:p-8">
          <p>
            <strong className="text-ink">Crossline</strong> started from a sketch in a notebook margin:
            a 3×3 grid, three X&apos;s, three O&apos;s, one question —{" "}
            <em className="hand text-xl text-ink">who sees the line first?</em>
          </p>
          <p>
            Each player owns three marks — <strong className="text-ink">X</strong> moves first,{" "}
            <strong className="text-ink">O</strong> second. On your turn you slide one piece exactly
            one square, in any of the eight directions. The first player to arrange all three of
            their marks in a straight line wins.
          </p>
          <p>
            Quick matches, real tactics: every attacking move opens a square behind you, so each
            push forward is also a risk. The full game has been solved exactly (3,360 positions) —
            with perfect play it is a draw, which is why the threefold-repetition rule keeps
            matches decisive instead of endless.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <CrosslineLogo size={48} className="shrink-0" />
            <p>
              Play against the computer (including a perfect Hard bot driven by the solved table),
              share a device with a friend, or create an online room and share the five-letter code.
              No accounts, no downloads — just the board.
            </p>
          </div>
        </div>
        <DoodleScribble className="mx-auto mt-6 h-5 w-40 text-ink-muted" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/play" className="btn btn-play min-h-12 px-6">Play now</Link>
          <Link href="/how-to-play" className="btn btn-neutral min-h-12 px-6">How to play</Link>
        </div>
      </main>
    </>
  );
}
