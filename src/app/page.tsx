import type { Metadata } from "next";
import Link from "next/link";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { BoardPreview } from "@/components/home/BoardPreview";
import { HomeMenu } from "@/components/home/HomeMenu";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  DoodleArrow,
  DoodleNote,
  DoodleScribble,
  DoodleStar,
  DoodleUnderline,
} from "@/components/doodle/Doodles";

export const metadata: Metadata = {
  title: "Crossline — Three Pieces. One Line. Outsmart Your Rival.",
  description: "Three pieces. One line. Outsmart your rival. Slide your three marks one square at a time and complete a line before your opponent does.",
};

const CONCEPTS = [
  { k: "1 · Move", v: "Slide one piece to any touching square.", rotate: "-rotate-[0.8deg]" },
  { k: "2 · Outsmart", v: "Block their line while you build yours.", rotate: "rotate-[0.7deg]" },
  { k: "3 · Connect", v: "Three in a row wins. That's the game.", rotate: "-rotate-[0.5deg]" },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="animate-rise-in mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 sm:px-6">
        {/* ---------- Hero: illustrated composition ---------- */}
        <div className="grid w-full items-center gap-10 pt-8 md:grid-cols-[1.1fr_minmax(0,400px)] md:pt-12">
          <section className="relative flex flex-col items-center text-center md:items-start md:text-left">
            <DoodleStar aria-hidden className="absolute -top-2 right-6 h-8 w-8 text-gold md:right-16" />
            <p className="hand inline-block -rotate-2 border-2 border-dashed border-ink px-3 py-1 text-lg font-bold text-ink-soft">
              easy to learn · hard to outthink
            </p>
            <h1 className="display mt-3 max-w-full text-[clamp(3rem,16vw,7.5rem)] leading-[0.9] tracking-tight">
              CROSS<span className="text-x">LINE</span>
            </h1>
            <DoodleUnderline className="mt-1 h-4 w-64 text-x md:w-80" />
            <p className="hand mt-3 text-2xl font-semibold text-ink sm:text-3xl">
              Three pieces. One line. <span className="scribble-underline">Outsmart your rival.</span>
            </p>
            <p className="mt-4 max-w-md text-base font-semibold text-ink-soft">
              A fast 1v1 tactical duel on a hand-drawn 3×3 grid. Slide one mark to a touching
              square each turn — first to line up all three wins.
            </p>
            <div className="relative mt-8 w-full max-w-md">
              <DoodleNote className="absolute -top-7 right-0 hidden text-x sm:block" rotate={5}>
                pick your duel ↓
              </DoodleNote>
              <HomeMenu />
            </div>
          </section>

          <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
            <BoardPreview className="animate-pop-in" />
            <p className="mt-10 text-center text-sm font-bold text-ink-muted">
              X opens · 8-direction moves · first line wins
            </p>
            <DoodleScribble className="mx-auto mt-2 h-5 w-32 text-ink-muted" />
          </div>
        </div>

        {/* ---------- Concepts ---------- */}
        <section aria-label="How it works" className="mt-16 md:mt-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-4xl sm:text-5xl">
              Small rules, <span className="text-x">deep</span> decisions.
            </h2>
            <DoodleArrow className="hidden h-10 w-24 shrink-0 text-ink sm:block" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CONCEPTS.map((s) => (
              <div key={s.k} className={`card sticker p-5 ${s.rotate}`}>
                <p className="hand text-2xl font-bold text-x">{s.k}</p>
                <p className="mt-1 text-[15px] font-semibold leading-snug text-ink-soft">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Strip: modes + guide ---------- */}
        <section className="card sticker mt-10 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
          <div className="flex items-center gap-4">
            <CrosslineLogo size={56} className="shrink-0" />
            <div>
              <p className="display text-3xl">Think you can see the line?</p>
              <p className="text-sm font-semibold text-ink-soft">
                Learn the whole game in 30 seconds — then come back and prove it.
              </p>
            </div>
          </div>
          <Link href="/how-to-play" className="btn btn-play min-h-12 shrink-0 px-6 text-lg">
            How to play
          </Link>
        </section>
      </main>
    </>
  );
}
