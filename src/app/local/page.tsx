import type { Metadata } from "next";
import { OfflineGame } from "@/components/game/OfflineGame";

export const metadata: Metadata = {
  title: "Play Crossline Locally — 2 Players, One Device",
  description: "Play Crossline with a friend on the same device. X moves first.",
};

export default function LocalGamePage() {
  return <OfflineGame bot={null} />;
}
