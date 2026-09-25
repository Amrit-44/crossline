"use client";

import Link from "next/link";
import { useState } from "react";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { useSettings } from "@/components/providers/SettingsProvider";

const NAV = [
  { href: "/play", label: "Play" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { play } = useSettings();
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-5 sm:px-6">
      <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label="Crossline home">
        <CrosslineLogo size={44} priority className="transition-transform duration-200 group-hover:rotate-[-6deg]" />
        <span className="display truncate text-3xl tracking-tight">
          CROSS<span className="text-x">LINE</span>
        </span>
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
        {NAV.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg px-3 py-2 text-sm font-extrabold text-ink-soft underline-offset-4 hover:bg-ink/5 hover:text-ink hover:underline hover:decoration-x hover:decoration-wavy"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="btn btn-neutral min-h-11 shrink-0 px-3 text-sm md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          onClick={() => {
            play("click");
            setMenuOpen((v) => !v);
          }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          <span className="sr-only">Menu</span>
        </button>
        <button
          type="button"
          className="btn btn-neutral min-h-11 shrink-0 px-3 text-sm"
          aria-label="Open settings"
          onClick={() => {
            play("click");
            setSettingsOpen(true);
          }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>
      {menuOpen && (
        <nav
          id="site-mobile-nav"
          aria-label="Mobile"
          className="card animate-pop-in flex basis-full flex-col p-2 md:hidden"
        >
          {NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => {
                play("click");
                setMenuOpen(false);
              }}
              className="rounded-lg px-4 py-3 text-base font-extrabold text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
