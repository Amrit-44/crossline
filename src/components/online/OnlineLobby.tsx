"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/identity/Avatar";
import { useSettings } from "@/components/providers/SettingsProvider";
import { messageFor, realtimeApi, realtimeBaseUrl, rtSession } from "@/realtime/client";
import { ROOM_CODE_PATTERN } from "@/realtime/protocol";
import { AVATARS, isValidName, sanitizeName } from "@/lib/identity";

export function OnlineLobby() {
  const router = useRouter();
  const { settings, update, play } = useSettings();
  const [name, setName] = useState(settings.displayName);
  const [avatar, setAvatar] = useState("striker");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validName = () => {
    if (!isValidName(name)) {
      setError("Pick a display name (2–16 characters).");
      return null;
    }
    const clean = sanitizeName(name);
    update({ displayName: clean });
    return clean;
  };

  const create = async () => {
    const n = validName();
    if (!n) return;
    setBusy("create");
    setError(null);
    play("room");
    try {
      // Realtime authority: HTTPS create on the Worker (Durable Object),
      // gameplay continues over WebSocket. No database involved.
      const result = await realtimeApi.createRoom(realtimeBaseUrl(), n, avatar);
      rtSession.save(result.roomCode, { playerId: result.playerId, token: result.token, seat: result.seat });
      router.push(`/online/${result.roomCode}`);
    } catch (err) {
      play("error");
      setError(messageFor(err));
      setBusy(null);
    }
  };

  const join = async (event: FormEvent) => {
    event.preventDefault();
    const n = validName();
    if (!n) return;
    const normalized = code.trim().toUpperCase();
    if (!ROOM_CODE_PATTERN.test(normalized)) return setError("That doesn't look like a room code (5 letters/digits).");
    setBusy("join");
    setError(null);
    play("click");
    try {
      const info = await realtimeApi.roomInfo(realtimeBaseUrl(), normalized);
      // Room exists — go to the room page; the seat is claimed there.
      void info;
      router.push(`/online/${normalized}`);
    } catch (err) {
      play("error");
      setError(messageFor(err));
      setBusy(null);
    }
  };

  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-10">
      <Link href="/play" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Modes</Link>
      <p className="text-xs font-black uppercase tracking-widest text-x">Online multiplayer</p>
      <h1 className="display mt-1 text-5xl">Play online</h1>
      <p className="mt-2 font-medium text-ink-soft">No accounts. Pick a name and avatar, share a code, play.</p>

      <div className="card mt-6 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar id={avatar} size={56} label="Your avatar preview" />
          <label className="block flex-1">
            <span className="text-sm font-bold">Display name</span>
            <input
              className="input mt-1.5 min-h-12"
              value={name}
              maxLength={16}
              placeholder="e.g. Shadow"
              autoComplete="nickname"
              enterKeyHint="next"
              onChange={(e) => { setName(e.target.value); setError(null); }}
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Choose avatar">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              aria-label={a.label}
              title={a.label}
              onClick={() => { setAvatar(a.id); play("select"); }}
              className={`flex aspect-square items-center justify-center rounded-xl border ${avatar === a.id ? "border-x" : "border-line bg-bg-soft"}`}
            >
              <Avatar id={a.id} size={30} label={a.label} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="card flex flex-col p-5 sm:p-6">
          <h2 className="display text-2xl">Create room</h2>
          <p className="mt-1 flex-1 text-sm font-medium text-ink-soft">You&apos;ll play <span className="font-black text-x">X</span> and move first.</p>
          <Button variant="red" size="lg" className="mt-4 w-full" disabled={busy !== null} onClick={create}>
            {busy === "create" ? "Creating…" : "Create room"}
          </Button>
        </section>
        <form onSubmit={join} className="card flex flex-col p-5 sm:p-6">
          <h2 className="display text-2xl">Join room</h2>
          <p className="mt-1 text-sm font-medium text-ink-soft">You&apos;ll play <span className="font-black text-x">O</span>.</p>
          <input
            aria-label="Room code"
            className="input mt-3 min-h-12 text-center font-black uppercase tracking-[0.3em]"
            value={code}
            maxLength={5}
            placeholder="CODE"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="go"
            onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(null); }}
          />
          <Button type="submit" variant="blue" size="lg" className="mt-3 w-full" disabled={busy !== null || code.length !== 5}>
            {busy === "join" ? "Joining…" : "Join room"}
          </Button>
        </form>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</p>}

      <p className="mt-6 text-center text-xs font-semibold text-ink-muted">
        Every move is validated on the server. Drop your connection and your seat is held for 30 seconds.
      </p>
    </main>
  );
}
