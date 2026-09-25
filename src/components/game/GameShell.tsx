"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { toggleMusicExplicitly, useSettings } from "@/components/providers/SettingsProvider";

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      {muted ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

interface GameShellProps {
  modeLabel: string;
  red: ReactNode;
  blue: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  aside?: ReactNode;
  banner?: ReactNode;
  onExit?: () => void;
}

export function GameShell({ modeLabel, red, blue, children, footer, aside, banner, onExit }: GameShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, update, play } = useSettings();
  const muted = settings.muted || !settings.sfx;

  const toggleMute = () => {
    play("click");
    if (!muted) {
      update({ muted: true });
      toggleMusicExplicitly(false);
    } else {
      update({ muted: false, sfx: true });
      if (settings.music) toggleMusicExplicitly(true);
    }
  };

  return (
    <div className="game-shell safe-pt safe-pb animate-rise-in mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between gap-2 sm:gap-3">
        <Link
          href="/"
          onClick={onExit}
          className="btn btn-ghost min-h-11 shrink-0 px-3 text-sm"
          aria-label="Back to main menu"
        >
          <span aria-hidden>←</span> Menu
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <CrosslineLogo size={32} />
          <span className="game-shell-title display shrink-0 text-2xl tracking-tight">CROSS<span className="text-x">LINE</span></span>
          <span className="game-shell-chip hand truncate rotate-[-2deg] border-2 border-dashed border-ink px-2 py-0.5 text-base font-bold leading-none text-ink-soft">{modeLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost min-h-11 w-11 min-w-11 px-0"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            aria-pressed={!muted}
            onClick={toggleMute}
          >
            <SoundIcon muted={muted} />
          </button>
          <button type="button" className="btn btn-ghost min-h-11 w-11 min-w-11 px-0" aria-label="Settings" onClick={() => { play("click"); setSettingsOpen(true); }}>
            <GearIcon />
          </button>
        </div>
      </header>

      {banner && <div className="mt-3">{banner}</div>}

      <main className={`game-shell-main mt-4 grid flex-1 grid-cols-1 items-center gap-4 lg:gap-6 ${aside ? "lg:grid-cols-[200px_minmax(0,1fr)_200px_280px]" : "lg:grid-cols-[220px_minmax(0,1fr)_220px]"}`}>
        <div className="flex gap-3 lg:contents">
          {red}
          <div className="contents lg:hidden">{blue}</div>
        </div>
        <div className="game-shell-boardcol relative flex w-full flex-col items-center gap-3 lg:order-none">{children}</div>
        <div className="hidden lg:block">{blue}</div>
        {aside && <div className="min-h-0 lg:self-stretch">{aside}</div>}
      </main>

      <footer className="game-shell-footer mt-5 flex min-h-11 flex-wrap items-center justify-center gap-3">{footer}</footer>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
