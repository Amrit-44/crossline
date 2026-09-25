/**
 * End-to-end regression for the exact user flow:
 * Create Room → Join → Connect → Move A → Move B → Win → Rematch → Reconnect.
 *
 * Runs both simulated players through the same pure state machine the
 * CrosslineRoom Durable Object calls, so any engine/protocol drift fails here.
 */
import { describe, expect, it } from "vitest";
import { chooseBotMove } from "@/game/bot";
import {
  applyClientMessage,
  connectPlayerCore,
  createRoomCore,
  disconnectPlayerCore,
  joinRoomCore,
  snapshotOf,
  type RoomCore,
} from "../room-core";
import { RoomSocket } from "../client";
import type { ClientMessage } from "../protocol";

let ids = 0;
const newId = () => `id-${++ids}`;
const NOW = 5_000_000;

function send(core: RoomCore, playerId: string, token: string, message: ClientMessage, now = NOW) {
  return applyClientMessage(core, playerId, token, message, now, newId);
}

describe("full match flow (create → join → moves → win → rematch → reconnect)", () => {
  it("two players share one identical authoritative timeline", () => {
    // TEST 1 — Player A creates a room (HTTPS).
    let core = createRoomCore("ABCDE", { playerId: "p-a", token: "tok-a" }, "Asha", "striker", NOW, newId);
    expect(core.status).toBe("waiting");
    const v0 = core.version;

    // TEST 2 — Player B joins (HTTPS). Both connect (WebSocket).
    const joined = joinRoomCore(core, { playerId: "p-b", token: "tok-b" }, "Bikram", "halo", NOW, newId);
    core = joined.core;
    expect(joined.seat).toBe("blue");
    expect(core.status).toBe("active");
    expect(core.version).toBeGreaterThan(v0);

    core = connectPlayerCore(core, "p-a", "tok-a", NOW, newId).core;
    core = connectPlayerCore(core, "p-b", "tok-b", NOW, newId).core;
    expect(snapshotOf(core, "red", NOW).players.red?.connected).toBe(true);
    expect(snapshotOf(core, "blue", NOW).players.blue?.connected).toBe(true);

    // TEST 3/4 — A moves, B moves; both snapshots agree after every move.
    const firstMoves = [
      { seat: "red" as const, id: "p-a", token: "tok-a" },
      { seat: "blue" as const, id: "p-b", token: "tok-b" },
    ];
    let lastVersion = core.version;
    for (const { id, token } of firstMoves) {
      const mv = chooseBotMove(core.game, "medium");
      expect(mv).not.toBeNull();
      const out = send(core, id, token, { type: "move", from: mv!.from, to: mv!.to });
      expect(out.senderError).toBeNull();
      core = out.core;
      expect(core.version).toBeGreaterThan(lastVersion);
      lastVersion = core.version;
      // Both seats render the identical board.
      expect(snapshotOf(core, "red", NOW).game).toEqual(snapshotOf(core, "blue", NOW).game);
    }

    // TEST 5 — play the entire game; both see the same terminal result.
    let guard = 0;
    while (core.game.status === "playing" && guard++ < 300) {
      const turn = core.game.turn;
      const id = turn === "red" ? "p-a" : "p-b";
      const token = turn === "red" ? "tok-a" : "tok-b";
      const mv = chooseBotMove(core.game, "medium");
      expect(mv).not.toBeNull();
      const out = send(core, id, token, { type: "move", from: mv!.from, to: mv!.to });
      expect(out.senderError).toBeNull();
      core = out.core;
    }
    expect(core.game.status).not.toBe("playing");
    expect(core.status).toBe("finished");
    const redEnd = snapshotOf(core, "red", NOW);
    const blueEnd = snapshotOf(core, "blue", NOW);
    expect(redEnd.game).toEqual(blueEnd.game);
    expect(redEnd.finishReason).toBe(blueEnd.finishReason);

    // TEST 6 — rematch handshake resets both clients together.
    const gamesPlayed = core.gamesPlayed;
    const one = send(core, "p-a", "tok-a", { type: "rematch" });
    expect(one.senderError).toBeNull();
    expect(one.core.status).toBe("finished");
    const both = send(one.core, "p-b", "tok-b", { type: "rematch" });
    expect(both.core.status).toBe("active");
    expect(both.core.game.ply).toBe(0);
    expect(both.core.gamesPlayed).toBe(gamesPlayed + 1);
    core = both.core;

    // TEST 7 — refresh (disconnect + reconnect inside the window) keeps the game.
    core = disconnectPlayerCore(core, "p-a", NOW);
    expect(snapshotOf(core, "red", NOW).players.red?.connected).toBe(false);
    const back = connectPlayerCore(core, "p-a", "tok-a", NOW + 10_000, newId);
    expect(back.seat).toBe("red");
    expect(back.core.game.ply).toBe(core.game.ply);
    // Reconnect appends a presence message (version +1) but never touches the board.
    expect(back.core.version).toBe(core.version + 1);
    expect(back.core.game).toEqual(core.game);
    const resync = snapshotOf(back.core, "red", NOW + 10_000);
    expect(resync.game).toEqual(core.game);
  });
});

describe("socket resync (first snapshot after connect is always rendered)", () => {
  it("applies the welcome-then-state pair even when versions are equal", () => {
    const seen: Array<{ version: number }> = [];
    const statuses: string[] = [];
    interface FakeSocket {
      readyState: number;
      sent: string[];
      send(data: string): void;
      close(): void;
      onopen: (() => void) | null;
      onmessage: ((event: { data?: unknown }) => void) | null;
      onclose: (() => void) | null;
      onerror: (() => void) | null;
    }
    let fake: FakeSocket | null = null;
    const factory = () => {
      fake = {
        readyState: 1,
        sent: [] as string[],
        send(data: string) {
          this.sent.push(data);
        },
        close() {},
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };
      return fake;
    };
    const socket = new RoomSocket(
      "http://127.0.0.1:8787",
      "ABCDE",
      { playerId: "p-a", token: "tok-a" },
      {
        onSnapshot: (snap) => seen.push({ version: snap.version }),
        onStatus: (status) => statuses.push(status),
        onError: () => {},
      },
      factory,
    );
    socket.connect();
    // Read through a closure: narrowing inside closures uses the declared
    // type (TS otherwise assumes the factory never ran and `fake` is null).
    const getFake = (): FakeSocket => {
      if (!fake) throw new Error("socket factory was not called");
      return fake;
    };
    const fx = getFake();
    fx.onopen?.();
    expect(statuses).toContain("connected");

    // The DO sends welcome(version N) immediately followed by state(version N).
    const deliver = (payload: unknown) => fx.onmessage?.({ data: JSON.stringify(payload) });
    const snapAt = (version: number) => ({
      code: "ABCDE",
      status: "active",
      version,
      game: createRoomCore("ABCDE", { playerId: "p-a", token: "tok-a" }, "Asha", null, NOW, newId).game,
      seat: "red",
      players: { red: null, blue: null },
      messages: [],
      finishReason: null,
      forfeitedBy: null,
      gamesPlayed: 0,
      serverTime: NOW,
    });
    deliver({ type: "welcome", playerId: "p-a", seat: "red", version: 3 });
    deliver({ type: "state", version: 3, snapshot: snapAt(3) });
    expect(seen).toEqual([{ version: 3 }]);

    // Stale replays are ignored; strictly newer snapshots apply.
    deliver({ type: "state", version: 2, snapshot: snapAt(2) });
    expect(seen).toEqual([{ version: 3 }]);
    deliver({ type: "state", version: 4, snapshot: snapAt(4) });
    expect(seen).toEqual([{ version: 3 }, { version: 4 }]);

    socket.destroy();
  });
});
