import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Crossline Privacy Policy",
  description: "Crossline privacy policy: what data the game actually collects and how it is handled.",
};

export default function PrivacyPage() {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <Link href="/" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Menu</Link>
      <p className="text-xs font-black uppercase tracking-widest text-x">Legal</p>
      <h1 className="display mt-1 text-5xl">Privacy Policy</h1>
      <p className="mt-2 text-sm font-medium text-ink-muted">Last updated: September 2026. Short version: Crossline collects as little as possible.</p>
      <div className="card mt-6 space-y-4 p-6 text-[15px] font-medium leading-relaxed text-ink-soft sm:p-8">
        <section>
          <h2 className="display text-xl text-ink">What we store locally on your device</h2>
          <p className="mt-1">Your display name, avatar choice, game settings (sound, motion, contrast), onboarding completion, and online session tokens live in your browser&apos;s local/session storage. They never leave your device except as described below. Clearing site data removes them.</p>
        </section>
        <section>
          <h2 className="display text-xl text-ink">Online multiplayer data</h2>
          <p className="mt-1">When you create or join a room, the server stores: the 5-letter room code, your display name and avatar, an anonymous session token, the board state and move history, chat messages (up to 60 per room), and presence timestamps. Rooms expire automatically (waiting rooms after ~15 minutes of inactivity) and stale data is cleaned up. Chat is limited to 200 characters per message and rate-limited.</p>
        </section>
        <section>
          <h2 className="display text-xl text-ink">Contact messages</h2>
          <p className="mt-1">If you use the contact form, we receive the name, email, and message you type, used only to read and respond. Messages are rate-limited (3 per minute per address).</p>
        </section>
        <section>
          <h2 className="display text-xl text-ink">What we don&apos;t collect</h2>
          <p className="mt-1">No accounts, no passwords, no email tracking, no advertising identifiers, and no third-party analytics unless explicitly configured. There is currently no analytics installed.</p>
        </section>
        <section>
          <h2 className="display text-xl text-ink">Technical logs</h2>
          <p className="mt-1">The hosting provider may keep standard server logs (request times, error traces) for reliability and abuse prevention. Contact-form submissions log the sender name and timestamp server-side.</p>
        </section>
        <section>
          <h2 className="display text-xl text-ink">Your rights</h2>
          <p className="mt-1">Online rooms are anonymous and expire automatically. To remove local data, clear your browser&apos;s site storage. For any privacy question, use the contact page.</p>
        </section>
      </div>
    </main>
  );
}
