import Link from "next/link";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { DoodleScribble } from "@/components/doodle/Doodles";

const PLAY_LINKS = [
  { href: "/play", label: "Play" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer border-t-2 border-dashed border-ink/30 bg-bg-soft/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2.5">
            <CrosslineLogo size={36} />
            <span className="display text-3xl tracking-tight">
              CROSS<span className="text-x">LINE</span>
            </span>
          </p>
          <p className="mt-2 max-w-sm text-sm font-semibold text-ink-soft">
            Three pieces. One line. Outsmart your rival. A fast 1v1 tactical board game for quick matches on any device.
          </p>
          <DoodleScribble className="mt-3 h-4 w-28 text-ink-muted" />
          <p className="mt-3 font-hand text-lg font-semibold leading-none text-ink-muted">© {new Date().getFullYear()} Crossline. Drawn by hand, played by brain.</p>
        </div>
        <nav aria-label="Game navigation">
          <p className="hand text-xl font-bold uppercase tracking-[0.2em] text-ink-muted">Game</p>
          <ul className="mt-3 space-y-2">
            {PLAY_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block py-1.5 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline hover:decoration-x hover:decoration-wavy">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal navigation">
          <p className="hand text-xl font-bold uppercase tracking-[0.2em] text-ink-muted">Legal</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block py-1.5 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline hover:decoration-x hover:decoration-wavy">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
