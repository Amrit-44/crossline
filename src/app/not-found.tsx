import type { Metadata } from "next";
import Link from "next/link";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { DoodleScribble } from "@/components/doodle/Doodles";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <div className="card sticker w-full p-8">
        <CrosslineLogo size={72} className="mx-auto" />
        <p className="hand mt-3 text-xl font-bold uppercase tracking-[0.25em] text-x">off the board!</p>
        <h1 className="display mt-1 text-5xl">404</h1>
        <p className="mt-3 font-semibold text-ink-soft">
          That square doesn&apos;t exist. No worries — the real duel is one tap away.
        </p>
        <DoodleScribble className="mx-auto mt-4 h-4 w-28 text-ink-muted" />
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/" className="btn btn-play min-h-12 w-full px-5 text-lg">Back home</Link>
          <Link href="/play" className="btn btn-ghost min-h-11 w-full text-sm">Choose a mode</Link>
        </div>
      </div>
    </main>
  );
}
