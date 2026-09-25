import type { Metadata } from "next";
import Link from "next/link";
import { OnlineRoom } from "@/components/online/OnlineRoom";
import { ROOM_CODE_PATTERN } from "@/realtime/protocol";

export const metadata: Metadata = {
  title: "Online room",
  description: "Join a live Crossline online duel. Share moves in real time against your rival.",
  robots: { index: false, follow: false },
};

export default async function OnlineRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <div className="card w-full p-8">
          <h1 className="display text-4xl">Invalid room code</h1>
          <p className="mt-3 font-semibold text-ink-soft">Room codes are five letters or digits.</p>
          <Link href="/online" className="btn btn-gold mt-6 min-h-12 w-full px-5">Back to lobby</Link>
        </div>
      </main>
    );
  }
  return <OnlineRoom code={normalized} />;
}
