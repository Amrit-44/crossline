import type { Metadata } from "next";
import { Suspense } from "react";
import { BotGameClient } from "./BotGameClient";

export const metadata: Metadata = {
  title: "Play Crossline vs Bot — Easy, Medium & Perfect Hard",
  description: "Play Crossline against the computer: Easy, Medium, or perfect Hard from the solved game table.",
};

export default function BotPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center px-5"><p className="text-sm font-semibold text-ink-soft">Loading match…</p></main>}>
      <BotGameClient />
    </Suspense>
  );
}
