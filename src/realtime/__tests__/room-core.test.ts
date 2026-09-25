import { describe, expect, it } from "vitest";
import { chooseBotMove } from "@/game/bot";
import {
  applyClientMessage,
  connectPlayerCore,
  createRoomCore,
  disconnectPlayerCore,
  isCleanupEligible,
  joinRoomCore,
  reconcileCore,
  snapshotOf,
  type RoomCore,
} from "../room-core";
import {
  LIMITS,
  parseClientMessage,
  RealtimeError,
  type ClientMessage,
} from "../protocol";

let ids = 0;
const newId = () => `id-${++ids}`;
const NOW = 1_000_000;

function freshRoom(now = NOW): RoomCore {
  return createRoomCore("ABCDE", { playerId: "p-red", token: "t-red" }, "Red", "striker", now, newId);
}

function activeRoom(now = NOW): RoomCore {
  const { core } = joinRoomCore(freshRoom(now), { playerId: "p-blue", token: "t-blue" }, "Blue", "halo", now, newId);
  return core;
}

function send(
  core: RoomCore,
  seat: "red" | "blue",
  message: ClientMessage,
  now = NOW,
): ReturnType<typeof applyClientMessage> {
  const id = seat === "red" ? "p-red" : "p-blue";
  const token = seat === "red" ? "t-red" : "t-blue";
  return applyClientMessage(core, id, token, message, now, newId);
}

const expectCode = (outcome: { senderError: RealtimeError | null }, code: string) => {
  expect(outcome.senderError?.code).toBe(code);
};

describe("room lifecycle", () => {
  it("creates a waiting room with Red seated", () => {
    const core = freshRoom();
    expect(core.status).toBe("waiting");
    expect(core.version).toBe(1);
    expect(core.red?.name).toBe("Red");
    expect(core.blue).toBeNull();
    expect(core.game.ply).toBe(0);
  });

  it("rejects bad names", () => {
    expect(() => freshRoom()).not.toThrow();
    expect(() => createRoomCore("ABCDE", { playerId: "x", token: "y" }, "", null, NOW, newId)).toThrowError(
      expect.objectContaining({ code: "invalid-name" }),
    );
  });

  it("join seats Blue and starts the game", () => {
    const core = activeRoom();
    expect(core.status).toBe("active");
    expect(core.blue?.name).toBe("Blue");
    expect(core.version).toBeGreaterThan(1);
  });

  it("a third player is refused", () => {
    const core = activeRoom();
    expect(() =>
      joinRoomCore(core, { playerId: "p3", token: "t3" }, "Third", null, NOW, newId),
    ).toThrowError(expect.objectContaining({ code: "room-full" }));
  });

  it("abandoned waiting rooms expire", () => {
    const core = freshRoom(NOW);
    const later = reconcileCore(core, NOW + LIMITS.WAITING_TTL_MS + 1);
    expect(later.status).toBe("expired");
    expect(isCleanupEligible(later, NOW + LIMITS.WAITING_TTL_MS * 2 + 2)).toBe(true);
  });
});

describe("presence", () => {
  it("connect marks the seat connected; disconnect clears it; reconnect restores", () => {
    let core = activeRoom();
    const c1 = connectPlayerCore(core, "p-red", "t-red", NOW, newId);
    expect(c1.seat).toBe("red");
    core = c1.core;
    expect(snapshotOf(core, "red", NOW).players.red?.connected).toBe(true);

    core = disconnectPlayerCore(core, "p-red", NOW);
    expect(snapshotOf(core, "red", NOW).players.red?.connected).toBe(false);

    // Reconnect inside the window: same seat, game intact.
    const c2 = connectPlayerCore(core, "p-red", "t-red", NOW + 10_000, newId);
    expect(c2.seat).toBe("red");
    expect(c2.core.game.ply).toBe(0);
  });

  it("wrong token is unauthorized and never reveals the seat", () => {
    const core = activeRoom();
    expect(() => connectPlayerCore(core, "p-red", "wrong", NOW, newId)).toThrowError(
      expect.objectContaining({ code: "unauthorized" }),
    );
    expect(() => connectPlayerCore(core, "nobody", "t-red", NOW, newId)).toThrowError(
      expect.objectContaining({ code: "unauthorized" }),
    );
  });

  it("silent seats forfeit after the reconnect window", () => {
    let core = activeRoom(NOW);
    core = reconcileCore(core, NOW + LIMITS.PRESENCE_TIMEOUT_MS + LIMITS.RECONNECT_WINDOW_MS + 1);
    expect(core.status).toBe("finished");
    expect(core.finishReason).toBe("forfeit-disconnect");
    expect(core.game.winner).toBe("blue");
  });
});

describe("moves", () => {
  it("red's opening move applies, bumps version, flips turn", () => {
    const core = activeRoom();
    const out = send(core, "red", { type: "move", from: 0, to: 1 });
    expect(out.senderError).toBeNull();
    expect(out.core.game.ply).toBe(1);
    expect(out.core.game.turn).toBe("blue");
    expect(out.core.game.board[1]).toBe("red");
    expect(out.core.version).toBe(core.version + 1);
  });

  it("blue cannot move out of turn; red cannot move blue's piece", () => {
    const core = activeRoom();
    expectCode(send(core, "blue", { type: "move", from: 5, to: 4 }), "not-your-turn");
    expectCode(send(core, "red", { type: "move", from: 5, to: 4 }), "illegal-move");
    expectCode(send(core, "red", { type: "move", from: 0, to: 2 }), "illegal-move");
  });

  it("rejected moves leave state untouched", () => {
    const core = activeRoom();
    const out = send(core, "blue", { type: "move", from: 5, to: 4 });
    expect(out.core.game.ply).toBe(0);
    expect(out.core.version).toBe(core.version);
  });

  it("moves before join and after finish are rejected", () => {
    expectCode(send(freshRoom(), "red", { type: "move", from: 0, to: 1 }), "game-not-started");
  });

  it("a full bot-vs-bot game finishes and versions increase monotonically", () => {
    let core = activeRoom();
    let lastVersion = core.version;
    let guard = 0;
    while (core.game.status === "playing" && guard++ < 300) {
      const seat = core.game.turn;
      const mv = chooseBotMove(core.game, seat === "red" ? "hard" : "medium");
      expect(mv).not.toBeNull();
      const out = send(core, seat, { type: "move", from: mv!.from, to: mv!.to });
      expect(out.senderError).toBeNull();
      core = out.core;
      expect(core.version).toBeGreaterThan(lastVersion);
      lastVersion = core.version;
    }
    expect(core.game.status).not.toBe("playing");
    expect(core.status).toBe("finished");
    expectCode(send(core, core.game.turn, { type: "move", from: 0, to: 1 }), "game-over");
  });
});

describe("rematch", () => {
  function finished(): RoomCore {
    let core = activeRoom();
    let guard = 0;
    while (core.game.status === "playing" && guard++ < 300) {
      const seat = core.game.turn;
      const mv = chooseBotMove(core.game, "medium");
      core = send(core, seat, { type: "move", from: mv!.from, to: mv!.to }).core;
    }
    return core;
  }

  it("handshake resets the game in the same room", () => {
    let core = finished();
    const gamesPlayed = core.gamesPlayed;
    const one = send(core, "red", { type: "rematch" });
    expect(one.senderError).toBeNull();
    expect(one.core.status).toBe("finished");
    expect(snapshotOf(one.core, "red", NOW).players.red?.wantsRematch).toBe(true);
    const both = send(one.core, "blue", { type: "rematch" });
    expect(both.core.status).toBe("active");
    expect(both.core.game.ply).toBe(0);
    expect(both.core.gamesPlayed).toBe(gamesPlayed + 1);
    expect(both.core.version).toBeGreaterThan(one.core.version);
  });

  it("rematch before finish is rejected", () => {
    expectCode(send(activeRoom(), "red", { type: "rematch" }), "bad-request");
  });
});

describe("leave + chat", () => {
  it("leaver forfeits an active game", () => {
    const out = send(activeRoom(), "red", { type: "leave" });
    expect(out.core.status).toBe("finished");
    expect(out.core.finishReason).toBe("forfeit-left");
    expect(out.core.game.winner).toBe("blue");
  });

  it("chat broadcasts within limits and rate-limits spam", () => {
    let core = activeRoom();
    const first = send(core, "red", { type: "chat", text: "gg!" }, NOW);
    expect(first.senderError).toBeNull();
    expect(first.core.messages.some((m) => m.text === "gg!")).toBe(true);
    const spam = send(first.core, "red", { type: "chat", text: "spam" }, NOW + 100);
    expectCode(spam, "rate-limited");
    const later = send(first.core, "red", { type: "chat", text: "ok" }, NOW + LIMITS.CHAT_INTERVAL_MS + 1);
    expect(later.senderError).toBeNull();
  });
});

describe("move idempotency", () => {
  it("replays of the same moveId are acknowledged without re-executing", () => {
    const core = activeRoom();
    const first = send(core, "red", { type: "move", from: 0, to: 1, moveId: "mv-1" });
    expect(first.senderError).toBeNull();
    expect(first.core.game.ply).toBe(1);
    expect(first.core.version).toBe(core.version + 1);
    // Same move arrives again (duplicate delivery): no second execution.
    const replay = send(first.core, "red", { type: "move", from: 0, to: 1, moveId: "mv-1" });
    expect(replay.senderError).toBeNull();
    expect(replay.core.game.ply).toBe(1);
    expect(replay.core.version).toBe(first.core.version);
  });

  it("a move from an impossible future version is rejected", () => {
    const core = activeRoom();
    const out = send(core, "red", { type: "move", from: 0, to: 1, clientVersion: core.version + 99 });
    expect(out.senderError?.code).toBe("bad-request");
    expect(out.core.game.ply).toBe(0);
  });

  it("moveId survives JSON round-trip parsing", () => {
    expect(parseClientMessage({ type: "move", from: 0, to: 1, moveId: "abc-123", clientVersion: 3 })).toEqual({
      type: "move",
      from: 0,
      to: 1,
      moveId: "abc-123",
      clientVersion: 3,
    });
    expect(parseClientMessage({ type: "move", from: 0, to: 1 })).toEqual({ type: "move", from: 0, to: 1 });
    expect(() => parseClientMessage({ type: "move", from: 0, to: 1, moveId: "not a uuid!!" })).toThrowError(
      RealtimeError,
    );
  });
});

describe("protocol parsing", () => {
  it("accepts valid messages incl. JSON strings", () => {
    expect(parseClientMessage({ type: "move", from: 0, to: 1 })).toEqual({ type: "move", from: 0, to: 1 });
    expect(parseClientMessage('{"type":"ping"}')).toEqual({ type: "ping" });
    expect(parseClientMessage({ type: "chat", text: " hi " })).toEqual({ type: "chat", text: "hi" });
  });

  it("rejects null, arrays, banana cells, oversized chat", () => {
    for (const bad of [
      null,
      [],
      {},
      { type: "move", from: "banana", to: 1 },
      { type: "move", from: 0, to: 9 },
      { type: "chat", text: "" },
      { type: "chat", text: "x".repeat(201) },
      { type: "explode" },
    ]) {
      expect(() => parseClientMessage(bad)).toThrowError(RealtimeError);
    }
  });
});
