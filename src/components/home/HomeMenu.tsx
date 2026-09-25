"use client";

import Link from "next/link";
import { PieceGlyph } from "@/components/game/PieceGlyph";
import { DoodleArrow } from "@/components/doodle/Doodles";
import { useSettings } from "@/components/providers/SettingsProvider";

const MODES = [
  {
    href: "/bot",
    title: "PLAY BOT",
    copy: "Easy, Medium, Hard or Perfect. Warm up your brain.",
    mark: "red" as const,
    tape: "solo",
  },
  {
    href: "/local",
    title: "PLAY LOCAL",
    copy: "Two rivals, one screen. Pass & play.",
    mark: "blue" as const,
    tape: "2P",
  },
  {
    href: "/online",
    title: "PLAY ONLINE",
    copy: "Share a 5-letter code. Duel anywhere.",
    mark: "red" as const,
    tape: "vs",
  },
];

export function HomeMenu() {
  const { play } = useSettings();

  return (
    <div className="flex w-full flex-col items-stretch gap-4">
      {MODES.map((mode, i) => (
        <Link
          key={mode.href}
          href={mode.href}
          onClick={() => play("click")}
          className={`card animate-pop-in group relative flex items-center gap-4 overflow-visible p-4 pr-5 text-left transition-transform hover:-translate-y-0.5 hover:rotate-[-0.4deg] active:translate-y-0.5 sm:p-5 ${
            i === 0 ? "-rotate-[0.6deg]" : i === 1 ? "rotate-[0.5deg]" : "-rotate-[0.3deg]"
          }`}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span
            aria-hidden
            className="absolute -top-3 left-6 rotate-[-4deg] border-2 border-ink bg-gold-soft px-2 py-0.5 font-hand text-sm font-bold leading-none text-ink"
          >
            {mode.tape}
          </span>
          <span className="piece-token flex h-12 w-12 shrink-0 items-center justify-center min-[380px]:h-14 min-[380px]:w-14" data-color={mode.mark}>
            <PieceGlyph player={mode.mark} className="relative z-10 h-7 w-7 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="display block text-2xl leading-none min-[380px]:text-3xl">{mode.title}</span>
            <span className="mt-1 block text-sm font-semibold text-ink-soft">{mode.copy}</span>
          </span>
          <DoodleArrow className="hidden h-8 w-10 shrink-0 text-x transition-transform duration-200 group-hover:translate-x-1 min-[380px]:block min-[380px]:w-14" />
        </Link>
      ))}
    </div>
  );
}
