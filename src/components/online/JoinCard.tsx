"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/identity/Avatar";
import { useSettings } from "@/components/providers/SettingsProvider";
import { messageFor } from "@/realtime/client";
import { AVATARS, isValidName, sanitizeName } from "@/lib/identity";

interface JoinCardProps {
  code: string;
  onJoin: (name: string, avatar?: string) => Promise<void>;
}

export function JoinCard({ code, onJoin }: JoinCardProps) {
  const { settings, update, play } = useSettings();
  const [name, setName] = useState(settings.displayName);
  const [avatar, setAvatar] = useState("halo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidName(name)) return setError("Pick a display name (2–16 characters).");
    const clean = sanitizeName(name);
    setBusy(true);
    setError(null);
    update({ displayName: clean });
    play("join");
    try {
      await onJoin(clean, avatar);
    } catch (err) {
      play("error");
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="card w-full p-4 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-ink-soft">Join room</p>
        <p className="display mt-1 text-5xl tracking-[0.15em]">{code}</p>
        <p className="mt-1 text-sm font-medium text-ink-soft">You&apos;ll play <span className="font-black text-x">O</span> (second move).</p>
        <div className="mt-4 flex justify-center">
          <Avatar id={avatar} size={56} label="Your avatar preview" />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Choose avatar">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              aria-label={a.label}
              onClick={() => setAvatar(a.id)}
              className={`flex aspect-square items-center justify-center rounded-xl border ${avatar === a.id ? "border-x" : "border-line bg-bg-soft"}`}
            >
              <Avatar id={a.id} size={28} label={a.label} />
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-bold">Your display name</span>
          <input className="input mt-1.5 min-h-12" value={name} maxLength={16} placeholder="e.g. Shadow" autoFocus autoComplete="nickname" enterKeyHint="go" onChange={(e) => setName(e.target.value)} />
        </label>
        {error && <p role="alert" className="mt-3 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm font-semibold text-error">{error}</p>}
        <Button type="submit" variant="blue" size="lg" className="mt-5 w-full" disabled={busy}>
          {busy ? "Joining…" : "Join as O"}
        </Button>
        <Link href="/online" className="btn btn-ghost mt-2 min-h-11 w-full text-sm">Back to lobby</Link>
      </form>
    </main>
  );
}
