import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DoodleUnderline } from "@/components/doodle/Doodles";

export const metadata: Metadata = {
  title: "Crossline Rules — Learn How to Play",
  description: "The complete rules of Crossline: board, pieces, movement, winning lines, and draws.",
};

const RULES: { h: string; p: string }[] = [
  {
    h: "The board",
    p: "Crossline is played on a 3×3 grid — 9 squares, no more. Rows are numbered 1–3 top to bottom, columns 1–3 left to right.",
  },
  {
    h: "The pieces",
    p: "Each player owns exactly three marks. X (red ink) always moves first; O (ink ring) moves second. Pieces are never added, captured, or removed.",
  },
  {
    h: "Starting positions",
    p: "X starts in the left column (squares R1C1, R2C1, R3C1). O starts in the right column (R1C3, R2C3, R3C3). The middle column starts empty.",
  },
  {
    h: "Movement",
    p: "On your turn, slide exactly one of your pieces exactly one square. The destination must be empty and touching your piece — horizontally, vertically, or diagonally. All eight directions count. You cannot pass, stay still, jump over pieces, or move an opponent's piece.",
  },
  {
    h: "Winning",
    p: "The first player to hold all three of their marks in a straight row, column, or diagonal wins — with one exception (see home column). The winning line is drawn across the board the moment it is completed.",
  },
  {
    h: "The home-column exception",
    p: "Both sides begin already aligned in their own home column (X on the left, O on the right), so your home column never counts as a win for you. Every other line counts — including your opponent's home column, the middle column, all rows, and both diagonals.",
  },
  {
    h: "Invalid moves",
    p: "Moving out of turn, moving an empty square, moving an opponent's piece, stepping two squares, landing on an occupied square, or moving after the game has ended are all rejected — online, the server re-checks every move and refuses illegal ones.",
  },
  {
    h: "Repetition draw",
    p: "Perfect play in Crossline never ends, so if the exact same position (same board, same side to move) occurs three times, the game is declared a draw. Play for the win — but know when the line is gone.",
  },
  {
    h: "Turn order",
    p: "X moves first, then players alternate one move each. There is no placement phase: from move one, you slide pieces around the starting position.",
  },
];

export default function RulesPage() {
  return (
    <>
      <SiteHeader />
      <main className="animate-rise-in mx-auto flex w-full max-w-3xl flex-col px-5 py-8">
        <p className="hand text-2xl font-bold uppercase tracking-[0.25em] text-x">The fine print</p>
        <h1 className="display mt-1 text-5xl sm:text-6xl">Rules of the duel</h1>
        <DoodleUnderline className="mt-1 h-3 w-52 text-x" />
        <p className="mt-3 font-semibold text-ink-soft">
          Everything below is enforced exactly by the game engine — in bot games, local games, and by the server online.
        </p>

        <ol className="mt-8 grid gap-3">
          {RULES.map((s, i) => (
            <li key={s.h} className={`card sticker flex gap-4 p-5 ${i % 2 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]"}`}>
              <span aria-hidden className="hand flex h-10 w-10 shrink-0 rotate-[-4deg] items-center justify-center border-2 border-ink bg-gold-soft text-2xl font-bold">
                {i + 1}
              </span>
              <div>
                <h2 className="display text-3xl leading-none">{s.h}</h2>
                <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink-soft">{s.p}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/how-to-play" className="btn btn-play min-h-12 px-6">See it illustrated</Link>
          <Link href="/play" className="btn btn-neutral min-h-12 px-6">Play now</Link>
        </div>
      </main>
    </>
  );
}
