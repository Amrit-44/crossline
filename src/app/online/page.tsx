import type { Metadata } from "next";
import { OnlineLobby } from "@/components/online/OnlineLobby";

export const metadata: Metadata = {
  title: "Play Crossline Online — Create or Join a Room",
  description: "Create a Crossline room, share the 5-letter code, and duel a rival online in a server-validated match.",
};

export default function OnlinePage() {
  return <OnlineLobby />;
}
