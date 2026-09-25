/**
 * Shared realtime protocol for Crossline online multiplayer.
 *
 * Used by BOTH the Cloudflare Worker/Durable Object (server) and the Next.js
 * client. This file must stay free of Node.js, DOM, and framework imports so
 * it bundles cleanly into the Worker.
 */
import type { GameState } from "@/game/types";

export type Seat = "red" | "blue";
export type RoomStatus = "waiting" | "active" | "finished" | "expired";

export const LIMITS = {
  ROOM_CODE_LENGTH: 5,
  NAME_MIN: 2,
  NAME_MAX: 16,
  AVATAR_MAX: 24,
  CHAT_MAX: 200,
  CHAT_INTERVAL_MS: 2_000,
  CHAT_HISTORY: 60,
  /** No socket/heartbeat activity for this long → shown as disconnected. */
  PRESENCE_TIMEOUT_MS: 6_000,
  /** Seat is held this long after a disconnect before forfeit. */
  RECONNECT_WINDOW_MS: 30_000,
  /** A room nobody joined is discarded after this long. */
  WAITING_TTL_MS: 15 * 60_000,
  /** Finished rooms are removed after this long. */
  FINISHED_TTL_MS: 30 * 60_000,
  /** Largest single WebSocket message the server will parse. */
  MAX_MESSAGE_BYTES: 4_096,
  /** Reconnect backoff schedule (ms). */
  RECONNECT_BACKOFF_MS: [500, 1_000, 2_000, 4_000, 8_000],
  /** Heartbeat ping cadence (ms) over an open socket. */
  HEARTBEAT_MS: 25_000,
} as const;

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${LIMITS.ROOM_CODE_LENGTH}}$`);

/* ------------------------------------------------------------------ */
/* Client → server                                                      */
/* ------------------------------------------------------------------ */

export type ClientMessage =
  | { readonly type: "move"; readonly from: number; readonly to: number; readonly moveId?: string; readonly clientVersion?: number }
  | { readonly type: "chat"; readonly text: string }
  | { readonly type: "rematch" }
  | { readonly type: "leave" }
  | { readonly type: "request_state" }
  | { readonly type: "ping" };

/* ------------------------------------------------------------------ */
/* Server → client                                                      */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  readonly id: string;
  readonly from: Seat | "system";
  readonly name: string;
  readonly text: string;
  readonly at: number;
}

export interface PlayerView {
  readonly name: string;
  readonly avatar: string | null;
  readonly connected: boolean;
  /** Milliseconds left before the seat is forfeited; null when connected. */
  readonly forfeitInMs: number | null;
  readonly wantsRematch: boolean;
  readonly left: boolean;
}

export type FinishReason = "win" | "draw" | "forfeit-disconnect" | "forfeit-left";

export interface RoomSnapshot {
  readonly code: string;
  readonly status: RoomStatus;
  readonly version: number;
  readonly game: GameState;
  readonly seat: Seat;
  readonly players: { readonly red: PlayerView | null; readonly blue: PlayerView | null };
  readonly messages: readonly ChatMessage[];
  readonly finishReason: FinishReason | null;
  readonly forfeitedBy: Seat | null;
  readonly gamesPlayed: number;
  readonly serverTime: number;
}

export type ServerMessage =
  | { readonly type: "welcome"; readonly playerId: string; readonly seat: Seat; readonly version: number }
  | { readonly type: "state"; readonly version: number; readonly snapshot: RoomSnapshot }
  | { readonly type: "error"; readonly code: RealtimeErrorCode; readonly message: string }
  | { readonly type: "pong" };

/* ------------------------------------------------------------------ */
/* Errors                                                               */
/* ------------------------------------------------------------------ */

export type RealtimeErrorCode =
  | "invalid-name"
  | "invalid-code"
  | "room-not-found"
  | "room-full"
  | "room-expired"
  | "unauthorized"
  | "not-your-turn"
  | "illegal-move"
  | "game-over"
  | "game-not-started"
  | "invalid-message"
  | "rate-limited"
  | "bad-request"
  | "not-connected"
  | "server-error";

/** Player-facing copy. Never a bare "sync failed" — always the category. */
export const REALTIME_ERROR_MESSAGES: Record<RealtimeErrorCode, string> = {
  "invalid-name": "Pick a display name between 2 and 16 characters.",
  "invalid-code": "That doesn't look like a room code (5 letters/digits).",
  "room-not-found": "That room doesn't exist. Check the code and try again.",
  "room-full": "Room is full.",
  "room-expired": "This room has expired. Create a fresh one.",
  unauthorized: "You are not connected to this room. Rejoin to continue.",
  "not-your-turn": "Not your turn — wait for your opponent.",
  "illegal-move": "That move is no longer valid.",
  "game-over": "The game is already over.",
  "game-not-started": "Waiting for an opponent to join.",
  "invalid-message": "Messages must be 1–200 characters.",
  "rate-limited": "Slow down — one message every 2 seconds.",
  "bad-request": "That request didn't make sense. Try again.",
  "not-connected": "You are not connected to the room. Reconnecting…",
  "server-error": "Connection lost. Reconnecting…",
};

export class RealtimeError extends Error {
  constructor(public readonly code: RealtimeErrorCode) {
    super(REALTIME_ERROR_MESSAGES[code]);
  }
}

/* ------------------------------------------------------------------ */
/* HTTP REST shapes (create/join run over HTTPS, gameplay over WS)      */
/* ------------------------------------------------------------------ */

export interface CreateRoomRequest {
  readonly name: string;
  readonly avatar?: string;
}

export interface CreateRoomResponse {
  readonly roomCode: string;
  readonly playerId: string;
  readonly token: string;
  readonly seat: Seat;
  /** WebSocket path on the same origin, e.g. `/rooms/ABCDE/ws`. */
  readonly socketPath: string;
}

export type JoinRoomResponse = CreateRoomResponse;

export interface RoomInfoResponse {
  readonly roomCode: string;
  readonly status: RoomStatus;
  readonly hasOpponent: boolean;
}

/* ------------------------------------------------------------------ */
/* Validation (shared so client and server agree exactly)               */
/* ------------------------------------------------------------------ */

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") throw new RealtimeError("invalid-name");
  const name = raw.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, LIMITS.NAME_MAX);
  if (name.length < LIMITS.NAME_MIN) throw new RealtimeError("invalid-name");
  return name;
}

export function sanitizeAvatar(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") throw new RealtimeError("bad-request");
  const id = raw.replace(CONTROL_CHARS, "").trim().slice(0, LIMITS.AVATAR_MAX);
  if (!id) return null;
  if (!/^[a-z0-9-]+$/i.test(id)) throw new RealtimeError("bad-request");
  return id;
}

export function normalizeCode(raw: unknown): string {
  if (typeof raw !== "string") throw new RealtimeError("invalid-code");
  const code = raw.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) throw new RealtimeError("invalid-code");
  return code;
}

export function sanitizeChat(raw: unknown): string {
  if (typeof raw !== "string") throw new RealtimeError("invalid-message");
  const text = raw.replace(CONTROL_CHARS, "").trim();
  if (!text || text.length > LIMITS.CHAT_MAX) throw new RealtimeError("invalid-message");
  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCell(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 8) {
    throw new RealtimeError("bad-request");
  }
  return value;
}

/** Optional idempotency key: client-generated UUID-ish string, max 64 chars. */
function parseMoveId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new RealtimeError("bad-request");
  const id = value.trim().slice(0, 64);
  if (!id) return undefined;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new RealtimeError("bad-request");
  return id;
}

/** Optional client-side version the sender based its move on (stale guard). */
function parseClientVersion(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new RealtimeError("bad-request");
  }
  return value;
}

/** Validates an inbound WebSocket payload. Never throws anything else. */
export function parseClientMessage(raw: unknown): ClientMessage {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new RealtimeError("bad-request");
    }
  }
  if (!isRecord(raw) || typeof raw.type !== "string") throw new RealtimeError("bad-request");
  switch (raw.type) {
    case "move":
      return {
        type: "move",
        from: parseCell(raw.from),
        to: parseCell(raw.to),
        ...(parseMoveId(raw.moveId) ? { moveId: parseMoveId(raw.moveId) } : {}),
        ...(parseClientVersion(raw.clientVersion) !== undefined
          ? { clientVersion: parseClientVersion(raw.clientVersion) }
          : {}),
      };
    case "chat":
      return { type: "chat", text: sanitizeChat(raw.text) };
    case "rematch":
    case "leave":
    case "request_state":
    case "ping":
      return { type: raw.type };
    default:
      throw new RealtimeError("bad-request");
  }
}

export function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  return value.type === "welcome" || value.type === "state" || value.type === "error" || value.type === "pong";
}
