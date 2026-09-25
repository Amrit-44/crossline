"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { messageFor } from "@/realtime/client";
import { LIMITS, type ChatMessage, type Seat } from "@/realtime/protocol";

interface ChatProps {
  messages: readonly ChatMessage[];
  seat: Seat;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function Chat({ messages, seat, onSend, disabled }: ChatProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText("");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-label="Chat" className="card flex h-72 flex-col overflow-hidden lg:h-full lg:max-h-[560px]">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-ink-soft">Chat</h2>
        <span className="text-[11px] font-bold text-ink-muted">{messages.length ? `${messages.length}` : "Say hi 👋"}</span>
      </header>
      <div ref={listRef} className="scroll-thin flex-1 space-y-1.5 overflow-y-auto px-3 py-3" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((message) =>
          message.from === "system" ? (
            <p key={message.id} className="px-2 text-center text-[11px] font-bold text-ink-muted">{message.text}</p>
          ) : (
            <div key={message.id} className={`flex ${message.from === seat ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm font-semibold break-words ${message.from === "red" ? "bg-red-soft text-[#7a1f1f]" : "bg-blue-soft text-[#123f6b]"} ${message.from === seat ? "rounded-br-md" : "rounded-bl-md"}`}>
                {message.from !== seat && <span className="block text-[10px] font-black uppercase tracking-wider opacity-70">{message.name}</span>}
                {message.text}
              </div>
            </div>
          ),
        )}
      </div>
      <form onSubmit={submit} className="border-t border-line p-2">
        <div className="flex items-center gap-2">
          <input
            aria-label="Chat message"
            className="input min-h-11 flex-1 py-2 text-base"
            placeholder={disabled ? "Chat unavailable" : "Message…"}
            maxLength={LIMITS.CHAT_MAX}
            value={text}
            disabled={disabled || sending}
            autoComplete="off"
            enterKeyHint="send"
            onChange={(e) => { setText(e.target.value); setError(null); }}
          />
          <button type="submit" className="btn btn-blue min-h-11 px-4 text-sm" disabled={disabled || sending || !text.trim()} aria-label="Send message">
            Send
          </button>
        </div>
        <div className="mt-1 flex justify-between px-1 text-[11px] font-bold">
          <span className="text-red-deep" role="alert">{error ?? ""}</span>
          <span className="text-ink-muted">{text.length}/{LIMITS.CHAT_MAX}</span>
        </div>
      </form>
    </section>
  );
}
