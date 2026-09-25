import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PieceGlyph } from "@/components/game/PieceGlyph";
import { DoodleArrow, DoodleNote, DoodleStar, DoodleUnderline } from "@/components/doodle/Doodles";
import type { CellValue } from "@/game/types";

export const metadata: Metadata = {
  title: "How to Play Crossline",
  description: "Learn Crossline in 30 seconds: move one piece one square, line up all three, win before your rival.",
};

type Mark = "red" | "blue";

/** Tiny static board sketch for one tutorial step. */
function MiniBoard({
  cells,
  arrows,
  win,
  caption,
}: {
  cells: CellValue[];
  arrows?: { from: number; to: number; red?: boolean }[];
  win?: number[];
  caption: string;
}) {
  const cx = (i: number) => (i % 3) * 100 + 50;
  const cy = (i: number) => Math.floor(i / 3) * 100 + 50;
  return (
    <figure className="board-frame w-full max-w-[220px] shrink-0 p-3">
      <svg viewBox="0 0 300 300" role="img" aria-label={caption} className="block h-auto w-full">
        <g stroke="#2e2118" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M102 8 Q 100 100, 103 200 T 101 292" />
          <path d="M198 8 Q 200 100, 197 200 T 199 292" />
          <path d="M8 102 Q 100 100, 200 103 T 292 101" />
          <path d="M8 198 Q 100 200, 200 197 T 292 199" />
        </g>
        {cells.map((c, i) =>
          c ? (
            <g key={i} transform={`translate(${cx(i)},${cy(i)})`} stroke={c === "red" ? "#c23a22" : "#2e2118"} fill="none" strokeLinecap="round">
              {c === "red" ? (
                <>
                  <path d="M-22 -22 Q 0 0, 22 22" strokeWidth="11" />
                  <path d="M22 -22 Q 0 0, -22 22" strokeWidth="11" />
                </>
              ) : (
                <path d="M0 -24 Q 24 -24, 25 0 Q 26 24, 0 25 Q -25 26, -25 0 Q -25 -23, 0 -24" strokeWidth="10" />
              )}
            </g>
          ) : null,
        )}
        {arrows?.map((a, k) => (
          <g key={k} stroke={a.red === false ? "#2e2118" : "#c23a22"} strokeWidth="6" fill="none" strokeLinecap="round">
            <line
              x1={cx(a.from)}
              y1={cy(a.from)}
              x2={(cx(a.from) + cx(a.to)) / 2}
              y2={(cy(a.from) + cy(a.to)) / 2}
              strokeDasharray="12 10"
            />
            <circle cx={(cx(a.from) + cx(a.to)) / 2} cy={(cy(a.from) + cy(a.to)) / 2} r="10" />
          </g>
        ))}
        {win && (
          <line
            x1={cx(win[0])}
            y1={cy(win[0])}
            x2={cx(win[2])}
            y2={cy(win[2])}
            stroke="#c23a22"
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
      </svg>
      <figcaption className="hand mt-1 text-center text-xl font-semibold leading-tight text-ink-soft">{caption}</figcaption>
    </figure>
  );
}

const R: CellValue = "red";
const B: CellValue = "blue";
const _ = null;

export default function HowToPlayPage() {
  return (
    <>
      <SiteHeader />
      <main className="animate-rise-in mx-auto flex w-full max-w-3xl flex-col px-5 py-8">
        <p className="hand text-2xl font-bold uppercase tracking-[0.25em] text-x">Game guide · 30 seconds</p>
        <h1 className="display mt-1 text-5xl sm:text-6xl">How to play</h1>
        <DoodleUnderline className="mt-1 h-3 w-52 text-x" />
        <p className="mt-3 font-semibold text-ink-soft">Thirty seconds to learn. Much longer to stop falling for traps.</p>

        <ol className="mt-8 grid gap-4">
          <li className="card sticker flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <MiniBoard cells={[R, _, B, R, _, B, R, _, B]} arrows={[{ from: 4, to: 3 }]} caption="one piece, one square" />
            <div>
              <h2 className="display text-4xl"><span className="hand mr-2 text-3xl text-x">step 1 —</span>Move one piece</h2>
              <p className="mt-1 font-semibold text-ink-soft">Slide a single mark into a touching empty square. That&apos;s your whole turn.</p>
            </div>
          </li>
          <li className="card sticker flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <MiniBoard cells={[_, _, _, _, R, _, _, _, _]} arrows={[{ from: 4, to: 0 }, { from: 4, to: 2 }, { from: 4, to: 6 }, { from: 4, to: 8, red: false }]} caption="all 8 directions!" />
            <div>
              <h2 className="display text-4xl"><span className="hand mr-2 text-3xl text-x">step 2 —</span>Any direction</h2>
              <p className="mt-1 font-semibold text-ink-soft">Horizontal, vertical, or diagonal — from the center you can reach all eight neighbours.</p>
            </div>
          </li>
          <li className="card sticker flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <MiniBoard cells={[R, _, B, _, R, B, _, _, R]} win={[0, 4, 8]} caption="three in a row — win!" />
            <div>
              <h2 className="display text-4xl"><span className="hand mr-2 text-3xl text-x">step 3 —</span>Make a line</h2>
              <p className="mt-1 font-semibold text-ink-soft">Line up all three of your marks — row, column, or diagonal. Your starting column doesn&apos;t count, everything else does.</p>
            </div>
          </li>
          <li className="card sticker flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <MiniBoard cells={[R, B, _, _, R, _, _, _, B]} arrows={[{ from: 1, to: 2, red: false }]} caption="block it first!" />
            <div>
              <h2 className="display text-4xl"><span className="hand mr-2 text-3xl text-x">step 4 —</span>Block your rival</h2>
              <p className="mt-1 font-semibold text-ink-soft">Two enemy marks and an empty square? Sit on that square. Every attacking move opens a square behind you — defend while you build.</p>
            </div>
          </li>
          <li className="card sticker relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <DoodleNote className="absolute -top-4 right-4 text-x" rotate={6}>outsmart them!</DoodleNote>
            <MiniBoard cells={[R, _, B, _, B, _, R, R, _]} arrows={[{ from: 5, to: 4 }]} caption="set the trap…" />
            <div>
              <h2 className="display text-4xl"><span className="hand mr-2 text-3xl text-x">step 5 —</span>Outsmart them</h2>
              <p className="mt-1 font-semibold text-ink-soft">Good players build two threats at once. The rival can only block one. X moves first — make it count.</p>
            </div>
          </li>
        </ol>

        <div className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-3">
            <span className="piece-token flex h-11 w-11 items-center justify-center" data-color="red"><PieceGlyph player="red" className="relative z-10 h-5 w-5" /></span>
            <span className="piece-token flex h-11 w-11 items-center justify-center" data-color="blue"><PieceGlyph player="blue" className="relative z-10 h-5 w-5" /></span>
          </div>
          <p className="text-sm font-semibold text-ink-soft">
            <strong className="text-ink">X — the red pen — moves first.</strong> O — the ink ring — moves second.
            Tab to the board, arrows to move, Enter or Space to select and drop, Escape to cancel.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/local" className="btn btn-red min-h-12 px-5">Play local</Link>
          <Link href="/bot" className="btn btn-blue min-h-12 px-5">Play vs bot</Link>
          <Link href="/online" className="btn btn-gold min-h-12 px-5">Play online</Link>
          <Link href="/rules" className="btn btn-ghost min-h-12 px-3 text-sm">Full rules <DoodleArrow className="h-5 w-10" /></Link>
        </div>

        <p className="mt-8 flex items-center gap-2 font-hand text-xl text-ink-muted">
          <DoodleStar className="h-5 w-5 text-gold" /> same position 3× = draw. Perfect play never ends!
        </p>
      </main>
    </>
  );
}
