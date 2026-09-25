/**
 * Pure authoritative room state machine for Crossline online rooms.
 *
 * No I/O, no timers, no platform APIs — the Durable Object adapter owns
 * persistence/sockets/alarms and calls these functions. All game legality
 * comes from the shared engine (`@/game/*`), the single source of truth.
 */
import { otherPlayer } from "@/game/board";
import { applyMove, createInitialState } from "@/game/rules";
import type { GameState, Move } from "@/game/types";
import {
  LIMITS,
  RealtimeError,
  sanitizeAvatar,
  sanitizeChat,
  sanitizeName,
  type ChatMessage,
  type ClientMessage,
  type FinishReason,
  type PlayerView,
  type RoomSnapshot,
  type RoomStatus,
  type Seat,
  type ServerMessage,
} from "./protocol";

export interface PlayerSlot {
  readonly id: string;
  readonly token: string;
  readonly name: string;
  readonly avatar: string | null;
  readonly connected: boolean;
  readonly lastSeen: number;
  readonly lastChat: number | null;
  readonly wantsRematch: boolean;
  readonly left: boolean;
}

export interface RoomCore {
  readonly code: string;
  readonly status: RoomStatus;
  readonly version: number;
  readonly game: GameState;
  readonly red: PlayerSlot | null;
  readonly blue: PlayerSlot | null;
  readonly messages: readonly ChatMessage[];
  readonly finishReason: FinishReason | null;
  readonly forfeitedBy: Seat | null;
  readonly gamesPlayed: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Recently processed move ids for idempotent retry (capped). */
  readonly processedMoves: readonly string[];
}

export interface Identity {
  readonly playerId: string;
  readonly token: string;
}

const touch = (core: RoomCore, now: number, versionBump = true): RoomCore => ({
  ...core,
  version: versionBump ? core.version + 1 : core.version,
  updatedAt: now,
});

const systemMessage = (text: string, at: number, id: string): ChatMessage => ({
  id,
  from: "system",
  name: "",
  text,
  at,
});

const appendMessages = (core: RoomCore, ...added: ChatMessage[]): readonly ChatMessage[] =>
  [...core.messages, ...added].slice(-LIMITS.CHAT_HISTORY);

const slotOf = (core: RoomCore, seat: Seat): PlayerSlot | null =>
  seat === "red" ? core.red : core.blue;

const seatOf = (core: RoomCore, playerId: string): Seat => {
  if (core.red?.id === playerId) return "red";
  if (core.blue?.id === playerId) return "blue";
  throw new RealtimeError("unauthorized");
};

/** Constant-time token comparison (no Node APIs — Worker-safe). */
function tokensMatch(a: string | null | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function requireSeat(core: RoomCore, playerId: string, token: string): Seat {
  const seat = seatOf(core, playerId);
  const slot = slotOf(core, seat);
  if (!slot || !tokensMatch(slot.token, token)) throw new RealtimeError("unauthorized");
  if (slot.left) throw new RealtimeError("room-expired");
  return seat;
}

const nameOf = (core: RoomCore, seat: Seat): string => slotOf(core, seat)?.name ?? "Player";

const forfeitDeadline = (lastSeen: number): number =>
  lastSeen + LIMITS.PRESENCE_TIMEOUT_MS + LIMITS.RECONNECT_WINDOW_MS;

const isConnected = (slot: PlayerSlot | null, now: number): boolean =>
  slot !== null && slot.connected && now - slot.lastSeen < LIMITS.PRESENCE_TIMEOUT_MS;

const forcedWin = (game: GameState, winner: Seat): GameState => ({
  ...game,
  status: "won",
  winner,
  winningLine: null,
  drawReason: null,
});

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function createRoomCore(
  code: string,
  identity: Identity,
  rawName: unknown,
  rawAvatar: unknown,
  now: number,
  newId: () => string,
): RoomCore {
  const name = sanitizeName(rawName);
  const avatar = sanitizeAvatar(rawAvatar);
  const red: PlayerSlot = {
    id: identity.playerId,
    token: identity.token,
    name,
    avatar,
    connected: false,
    lastSeen: now,
    lastChat: null,
    wantsRematch: false,
    left: false,
  };
  return {
    code,
    status: "waiting",
    version: 1,
    game: createInitialState(),
    red,
    blue: null,
    messages: [systemMessage(`${name} created the room.`, now, newId())],
    finishReason: null,
    forfeitedBy: null,
    gamesPlayed: 0,
    createdAt: now,
    updatedAt: now,
    processedMoves: [],
  };
}

export function joinRoomCore(
  core: RoomCore,
  identity: Identity,
  rawName: unknown,
  rawAvatar: unknown,
  now: number,
  newId: () => string,
): { core: RoomCore; seat: Seat } {
  const reconciled = reconcileCore(core, now);
  if (reconciled.status === "expired") throw new RealtimeError("room-expired");
  if (reconciled.status !== "waiting" || reconciled.blue) throw new RealtimeError("room-full");
  const name = sanitizeName(rawName);
  const avatar = sanitizeAvatar(rawAvatar);
  const blue: PlayerSlot = {
    id: identity.playerId,
    token: identity.token,
    name,
    avatar,
    connected: false,
    lastSeen: now,
    lastChat: null,
    wantsRematch: false,
    left: false,
  };
  const next: RoomCore = {
    ...touch(reconciled, now),
    status: "active",
    blue,
    messages: appendMessages(reconciled, systemMessage(`${name} joined. Game on!`, now, newId())),
  };
  return { core: next, seat: "blue" };
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

export function connectPlayerCore(
  core: RoomCore,
  playerId: string,
  token: string,
  now: number,
  newId: () => string,
): { core: RoomCore; seat: Seat } {
  let next = reconcileCore(core, now);
  const seat = requireSeat(next, playerId, token);
  const slot = slotOf(next, seat)!;
  const wasConnected = isConnected(slot, now);
  const updated: PlayerSlot = { ...slot, connected: true, lastSeen: now };
  next = { ...next, ...(seat === "red" ? { red: updated } : { blue: updated }) };
  let bump = false;
  let messages = next.messages;
  if (!wasConnected && next.status === "active" && !slot.left) {
    messages = appendMessages(next, systemMessage(`${slot.name} reconnected.`, now, newId()));
    bump = true;
  }
  next = { ...touch(next, now, bump), messages };
  return { core: next, seat };
}

export function disconnectPlayerCore(core: RoomCore, playerId: string, now: number): RoomCore {
  const seat = seatOf(core, playerId);
  const slot = slotOf(core, seat);
  if (!slot || !slot.connected) return core;
  const updated: PlayerSlot = { ...slot, connected: false };
  return touch({ ...core, ...(seat === "red" ? { red: updated } : { blue: updated }) }, now, false);
}

/**
 * Time-driven transitions: abandoned waiting rooms expire; silent active
 * seats beyond the reconnect window forfeit. Pure — the DO calls this on
 * every inbound event and on alarm.
 */
export function reconcileCore(core: RoomCore, now: number): RoomCore {
  if (core.status === "waiting") {
    const redSeen = core.red?.lastSeen ?? core.createdAt;
    const abandoned = now > forfeitDeadline(redSeen);
    const stale = now - core.createdAt > LIMITS.WAITING_TTL_MS;
    if (abandoned || stale || core.red?.left) {
      return { ...touch(core, now), status: "expired" };
    }
    return core;
  }
  if (core.status !== "active") return core;
  for (const seat of ["red", "blue"] as const) {
    const slot = slotOf(core, seat);
    if (!slot || slot.left) continue;
    if (now <= forfeitDeadline(slot.lastSeen)) continue;
    const winner = otherPlayer(seat);
    return {
      ...touch(core, now),
      status: "finished",
      finishReason: "forfeit-disconnect",
      forfeitedBy: seat,
      game: forcedWin(core.game, winner),
      messages: appendMessages(
        core,
        systemMessage(`${slot.name} didn't reconnect in time. ${nameOf(core, winner)} wins.`, now, `sys-${now}`),
      ),
    };
  }
  return core;
}

/** True when the room may be deleted (DO cleanup). */
export function isCleanupEligible(core: RoomCore, now: number): boolean {
  if (core.status === "expired") return now - core.updatedAt > LIMITS.WAITING_TTL_MS;
  if (core.status === "finished") return now - core.updatedAt > LIMITS.FINISHED_TTL_MS;
  if (core.status === "waiting") return now - core.createdAt > LIMITS.WAITING_TTL_MS;
  return false;
}

/* ------------------------------------------------------------------ */
/* Client messages (single serialized entry point)                     */
/* ------------------------------------------------------------------ */

export interface CoreOutcome {
  readonly core: RoomCore;
  /** Snapshots to deliver. `to` null = broadcast to both seats. */
  readonly notify: ReadonlyArray<{ readonly to: Seat | null }>;
  /** Targeted error for the sender (not broadcast). */
  readonly senderError: RealtimeError | null;
}

const ok = (core: RoomCore, notify: CoreOutcome["notify"] = [{ to: null }]): CoreOutcome => ({
  core,
  notify,
  senderError: null,
});

export function applyClientMessage(
  core: RoomCore,
  playerId: string,
  token: string,
  message: ClientMessage,
  now: number,
  newId: () => string,
): CoreOutcome {
  let next: RoomCore;
  try {
    next = reconcileCore(core, now);
    var seat = requireSeat(next, playerId, token);
  } catch (error) {
    if (error instanceof RealtimeError) return { core, notify: [], senderError: error };
    throw error;
  }
  const slot = slotOf(next, seat)!;

  // Refresh presence on every authenticated message.
  const seen: PlayerSlot = { ...slot, connected: true, lastSeen: now };
  next = { ...next, ...(seat === "red" ? { red: seen } : { blue: seen }) };

  try {
    switch (message.type) {
      case "ping":
        return { core: touch(next, now, false), notify: [], senderError: null };
      case "request_state":
        return { core: touch(next, now, false), notify: [{ to: seat }], senderError: null };
      case "chat":
        return ok(sendChatCore(next, seat, message.text, now, newId));
      case "leave":
        return ok(leaveCore(next, seat, now, newId));
      case "rematch":
        return ok(rematchCore(next, seat, now, newId));
      case "move": {
        // Idempotency: a retried moveId resyncs the sender without replaying.
        if (message.moveId && next.processedMoves.includes(message.moveId)) {
          return { core: touch(next, now, false), notify: [{ to: seat }], senderError: null };
        }
        // Never apply a move from an impossible future version.
        if (message.clientVersion !== undefined && message.clientVersion > next.version) {
          throw new RealtimeError("bad-request");
        }
        const moved = moveCore(next, seat, { from: message.from, to: message.to }, now, newId);
        return ok(rememberMove(moved, message.moveId));
      }
    }
  } catch (error) {
    if (error instanceof RealtimeError) return { core: next, notify: [], senderError: error };
    throw error;
  }
}

const MAX_REMEMBERED_MOVES = 50;

const rememberMove = (core: RoomCore, moveId: string | undefined): RoomCore => {
  if (!moveId) return core;
  if (core.processedMoves.includes(moveId)) return core;
  return { ...core, processedMoves: [...core.processedMoves, moveId].slice(-MAX_REMEMBERED_MOVES) };
};

function moveCore(core: RoomCore, seat: Seat, move: Move, now: number, newId: () => string): RoomCore {
  void newId;
  if (core.status === "waiting") throw new RealtimeError("game-not-started");
  if (core.status !== "active") throw new RealtimeError("game-over");
  const result = applyMove(core.game, move, seat);
  if (!result.ok) {
    if (result.reason === "not-your-turn") throw new RealtimeError("not-your-turn");
    if (result.reason === "game-over") throw new RealtimeError("game-over");
    throw new RealtimeError("illegal-move");
  }
  const game = result.state;
  let next: RoomCore = { ...touch(core, now), game };
  if (game.status === "won") {
    next = {
      ...next,
      status: "finished",
      finishReason: "win",
      messages: appendMessages(
        next,
        systemMessage(`${nameOf(next, game.winner!)} wins with three in a row!`, now, `sys-${now}-win`),
      ),
    };
  } else if (game.status === "draw") {
    next = {
      ...next,
      status: "finished",
      finishReason: "draw",
      messages: appendMessages(
        next,
        systemMessage(
          game.drawReason === "repetition" ? "Draw by repetition." : "Draw — no moves left.",
          now,
          `sys-${now}-draw`,
        ),
      ),
    };
  }
  return next;
}

function sendChatCore(core: RoomCore, seat: Seat, rawText: string, now: number, newId: () => string): RoomCore {
  const text = sanitizeChat(rawText);
  const slot = slotOf(core, seat)!;
  if (slot.lastChat !== null && now - slot.lastChat < LIMITS.CHAT_INTERVAL_MS) {
    throw new RealtimeError("rate-limited");
  }
  const message: ChatMessage = { id: newId(), from: seat, name: slot.name, text, at: now };
  const updated: PlayerSlot = { ...slot, lastChat: now };
  return {
    ...touch(core, now),
    ...(seat === "red" ? { red: updated } : { blue: updated }),
    messages: appendMessages(core, message),
  };
}

function rematchCore(core: RoomCore, seat: Seat, now: number, newId: () => string): RoomCore {
  if (core.status !== "finished") throw new RealtimeError("bad-request");
  if (core.red?.left || core.blue?.left) throw new RealtimeError("bad-request");
  const red: PlayerSlot = { ...core.red!, wantsRematch: seat === "red" ? true : core.red!.wantsRematch };
  const blue: PlayerSlot = { ...core.blue!, wantsRematch: seat === "blue" ? true : core.blue!.wantsRematch };
  if (red.wantsRematch && blue.wantsRematch) {
    const gamesPlayed = core.gamesPlayed + 1;
    return {
      ...touch(core, now),
      status: "active",
      game: createInitialState(),
      gamesPlayed,
      red: { ...red, wantsRematch: false, lastSeen: now },
      blue: { ...blue, wantsRematch: false, lastSeen: now },
      finishReason: null,
      forfeitedBy: null,
      messages: appendMessages(core, systemMessage(`Rematch! Game ${gamesPlayed + 1} begins.`, now, newId())),
    };
  }
  const slot = seat === "red" ? red : blue;
  void slot;
  return {
    ...touch(core, now),
    red,
    blue,
    messages: appendMessages(core, systemMessage(`${nameOf(core, seat)} wants a rematch.`, now, newId())),
  };
}

function leaveCore(core: RoomCore, seat: Seat, now: number, newId: () => string): RoomCore {
  const slot = slotOf(core, seat);
  if (!slot) throw new RealtimeError("unauthorized");
  const left: PlayerSlot = { ...slot, left: true, connected: false };
  let next: RoomCore = { ...core, ...(seat === "red" ? { red: left } : { blue: left }) };
  if (next.status === "waiting") {
    next = { ...next, status: "expired" };
  } else if (next.status === "active") {
    const winner = otherPlayer(seat);
    next = {
      ...next,
      status: "finished",
      finishReason: "forfeit-left",
      forfeitedBy: seat,
      game: forcedWin(next.game, winner),
    };
  }
  next = {
    ...touch(next, now),
    messages: appendMessages(next, systemMessage(`${slot.name} left the room.`, now, newId())),
  };
  return next;
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

function toPlayerView(slot: PlayerSlot | null, status: RoomStatus, now: number): PlayerView | null {
  if (!slot) return null;
  const connected = isConnected(slot, now);
  return {
    name: slot.name,
    avatar: slot.avatar,
    connected: connected && !slot.left,
    forfeitInMs:
      connected || slot.left || status !== "active"
        ? null
        : Math.max(0, forfeitDeadline(slot.lastSeen) - now),
    wantsRematch: slot.wantsRematch,
    left: slot.left,
  };
}

export function snapshotOf(core: RoomCore, seat: Seat, now: number): RoomSnapshot {
  return {
    code: core.code,
    status: core.status,
    version: core.version,
    game: core.game,
    seat,
    players: {
      red: toPlayerView(core.red, core.status, now),
      blue: toPlayerView(core.blue, core.status, now),
    },
    messages: core.messages,
    finishReason: core.finishReason,
    forfeitedBy: core.forfeitedBy,
    gamesPlayed: core.gamesPlayed,
    serverTime: now,
  };
}

export function welcomeMessage(seat: Seat, playerId: string, version: number): ServerMessage {
  return { type: "welcome", playerId, seat, version };
}

export function stateMessage(snapshot: RoomSnapshot): ServerMessage {
  return { type: "state", version: snapshot.version, snapshot };
}

export function errorMessage(error: RealtimeError): ServerMessage {
  return { type: "error", code: error.code, message: error.message };
}
