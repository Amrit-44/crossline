import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Crossline Terms",
  description: "Crossline terms of service: acceptable use, multiplayer conduct, and liability.",
};

const SECTIONS = [
  { h: "The game", p: "Crossline is a small indie web game provided as-is for personal entertainment. Rules, bots, and features may change as the game improves. Online rooms depend on server availability and are not guaranteed." },
  { h: "Acceptable use", p: "Play fair. Do not attempt to cheat, forge requests, flood the servers, enumerate rooms, scrape data, or interfere with other players' matches. Automated abuse, spam, or attacks on the service are prohibited." },
  { h: "Names and chat", p: "Display names, avatars, and chat messages are user-generated. Keep them clean: no hate, harassment, impersonation, explicit content, or illegal material. The server enforces length limits (names 2–16 chars, chat 200 chars) and rate limits, and abusive sessions or rooms may be terminated without notice." },
  { h: "Online multiplayer", p: "Moves are validated by the server; the browser is never trusted for rules, turns, winners, or scores. Rooms expire automatically, and disconnected seats are forfeited after the reconnect window so matches can't stall forever." },
  { h: "Intellectual property", p: "The Crossline name, board design, avatars, sounds, and code are the project's original work. You may share room codes and screenshots, but don't copy the game wholesale or misrepresent modified versions as official." },
  { h: "Termination", p: "We may rate-limit, expire, or close rooms and sessions involved in abuse. Serious or repeated abuse may lead to blocking further access from the offending source." },
  { h: "Liability", p: "To the maximum extent permitted by law, Crossline is provided without warranties, and the developers aren't liable for lost games, lost data, or interruptions. Your only remedy for dissatisfaction is to stop playing." },
  { h: "Contact", p: "Questions about these terms? Reach out via the contact page." },
];

export default function TermsPage() {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <Link href="/" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Menu</Link>
      <p className="text-xs font-black uppercase tracking-widest text-x">Legal</p>
      <h1 className="display mt-1 text-5xl">Terms of Service</h1>
      <p className="mt-2 text-sm font-medium text-ink-muted">Last updated: September 2026. Written for a small indie game, not a corporation.</p>
      <div className="card mt-6 space-y-5 p-6 sm:p-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="display text-xl">{s.h}</h2>
            <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink-soft">{s.p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
