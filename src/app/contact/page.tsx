import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Crossline",
  description: "Contact the Crossline developer: report bugs, suggest features, or ask questions.",
};

export default function ContactPage() {
  return (
    <main className="animate-rise-in mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-10">
      <Link href="/" className="btn btn-ghost mb-4 min-h-11 self-start px-3 text-sm"><span aria-hidden>←</span> Menu</Link>
      <p className="text-xs font-black uppercase tracking-widest text-x">Contact</p>
      <h1 className="display mt-1 text-5xl">Say hello</h1>
      <p className="mt-2 font-medium text-ink-soft">
        Found a bug, have a balance idea, or want to say the Hard bot humbled you? Send a message.
      </p>
      <div className="mt-6">
        <ContactForm />
      </div>
      <p className="mt-4 text-xs font-medium text-ink-muted">
        Messages are rate-limited and validated. Please don&apos;t include passwords or sensitive personal information.
      </p>
    </main>
  );
}
