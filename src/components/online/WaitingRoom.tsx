"use client";

import { useState } from "react";
import { CrosslineLogo } from "@/components/brand/CrosslineLogo";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { useSettings } from "@/components/providers/SettingsProvider";
import { PieceGlyph } from "@/components/game/PieceGlyph";

interface WaitingRoomProps {
  code: string;
  name: string;
  onCancel: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function WaitingRoom({ code, name, onCancel }: WaitingRoomProps) {
  const { show } = useToast();
  const { play } = useSettings();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window !== "undefined" ? `${window.location.origin}/online/${code}` : "";

  const copy = async (kind: "code" | "link") => {
    const ok = await copyText(kind === "code" ? code : link);
    if (ok) {
      setCopied(kind);
      play("click");
      show(kind === "code" ? "Room code copied" : "Invite link copied", "success");
      window.setTimeout(() => setCopied(null), 1600);
    } else {
      play("error");
      show("Couldn't copy — select the code and copy it manually.", "error");
    }
  };

  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 py-10">
      <div className="card sticker w-full p-6 text-center sm:p-8">
        <CrosslineLogo size={48} className="mx-auto" />
        <p className="hand mt-2 text-2xl font-bold uppercase tracking-[0.2em] text-x">Waiting for your rival…</p>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Share the code below — the duel starts the moment they join.</p>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-ink-soft">Room code</p>
        <p className="display mt-2 select-all text-[clamp(3rem,14vw,5rem)] tracking-[0.18em]" aria-label={`Room code ${code.split("").join(" ")}`}>
          {code}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="gold" onClick={() => copy("code")}>{copied === "code" ? "Copied ✓" : "Copy code"}</Button>
          <Button variant="neutral" onClick={() => copy("link")}>{copied === "link" ? "Copied ✓" : "Copy invite link"}</Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="card-flat border-x bg-red-soft p-4">
            <div className="piece-token mx-auto flex h-12 w-12 items-center justify-center" data-color="red"><PieceGlyph player="red" className="relative z-10 h-6 w-6" /></div>
            <p className="mt-2 truncate font-extrabold">{name}</p>
            <p className="hand text-xl font-bold leading-none text-x">X · you · first!</p>
          </div>
          <div className="card-flat flex flex-col items-center justify-center border-dashed p-4">
            <svg viewBox="0 0 48 48" aria-hidden className="h-12 w-12 text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="5 4">
              <circle cx="24" cy="24" r="15" />
              <path d="M24 14 V 24 L 31 29" />
            </svg>
            <div className="mt-1 flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="animate-dots block h-2.5 w-2.5 rounded-full bg-x" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="mt-2 font-hand text-xl font-bold leading-none text-ink-soft">waiting for O…</p>
            <p className="text-[11px] font-bold text-ink-muted">share the code!</p>
          </div>
        </div>
        <p className="mt-6 text-xs font-semibold text-ink-muted" role="status">The game starts automatically when your opponent joins.</p>
        <Button variant="ghost" className="mt-2" onClick={onCancel}>Cancel room</Button>
      </div>
    </main>
  );
}
