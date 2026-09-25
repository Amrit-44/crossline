"use client";

import { useState } from "react";
import { useSettings } from "@/components/providers/SettingsProvider";

const LIMITS = { name: 40, email: 80, message: 1000 };

/**
 * Functional contact form backed by POST /api/contact.
 * Validates client-side, sanitizes via controlled inputs + textContent
 * rendering, and surfaces server rate-limit / validation errors honestly.
 */
export function ContactForm() {
  const { play } = useSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const valid =
    name.trim().length >= 2 &&
    name.trim().length <= LIMITS.name &&
    /.+@.+\..+/.test(email.trim()) &&
    email.trim().length <= LIMITS.email &&
    message.trim().length >= 10 &&
    message.trim().length <= LIMITS.message;

  const submit = async () => {
    if (!valid || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Could not send your message. Please try again later.");
      }
      setStatus("sent");
      play("join");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not send your message.");
      play("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="card p-6 text-center" role="status">
        <p className="display text-3xl">Message received</p>
        <p className="mt-2 text-sm font-medium text-ink-soft">Thanks for writing — we&apos;ll read every word.</p>
        <button type="button" className="btn btn-neutral mt-5 min-h-11 px-5" onClick={() => { setStatus("idle"); setMessage(""); }}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="card flex flex-col gap-3 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Name</span>
        <input className="input min-h-12" value={name} maxLength={LIMITS.name} autoComplete="name" enterKeyHint="next" onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Email</span>
        <input className="input min-h-12" type="email" value={email} maxLength={LIMITS.email} autoComplete="email" enterKeyHint="next" inputMode="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Message ({message.trim().length}/{LIMITS.message})</span>
        <textarea className="input min-h-32" value={message} maxLength={LIMITS.message} enterKeyHint="send" onChange={(e) => setMessage(e.target.value)} placeholder="What happened? What would make Crossline better?" rows={5} />
      </label>
      {error && <p className="text-sm font-semibold text-error" role="alert">{error}</p>}
      <button type="submit" disabled={!valid || status === "sending"} className="btn btn-play min-h-12 w-full text-base">
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
