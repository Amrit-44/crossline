/**
 * Browser WebSocket manager for one Crossline room connection.
 *
 * - Owns connect / reconnect (capped exponential backoff), heartbeat,
 *   version-gated snapshot adoption, and in-flight move locking.
 * - The board is NEVER optimistic: snapshots from the server are the only
 *   state the UI renders.
 * - Framework-free so it can be unit-tested with a fake socket factory.
 */
import {
  isServerMessage,
  LIMITS,
  RealtimeError,
  REALTIME_ERROR_MESSAGES,
  type RealtimeErrorCode,
  type RoomSnapshot,
  type ServerMessage,
} from "./protocol";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "lost";

export interface SessionCredentials {
  readonly playerId: string;
  readonly token: string;
}

export interface RoomSocketEvents {
  readonly onSnapshot: (snapshot: RoomSnapshot) => void;
  readonly onStatus: (status: ConnectionState) => void;
  readonly onError: (code: RealtimeErrorCode, message: string) => void;
}

interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((this: unknown, ev: unknown) => void) | null;
  onmessage: ((this: unknown, ev: { data?: unknown }) => void) | null;
  onclose: ((this: unknown, ev: { code?: number; wasClean?: boolean }) => void) | null;
  onerror: ((this: unknown, ev: unknown) => void) | null;
}

const OPEN = 1;
const MAX_AUTO_ATTEMPTS = 12;

function newMoveId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function toSocketUrl(baseUrl: string, code: string, creds: SessionCredentials): string {
  const http = baseUrl.replace(/\/+$/, "");
  const ws = http.replace(/^http/, "ws");
  const params = new URLSearchParams({ playerId: creds.playerId, token: creds.token });
  return `${ws}/rooms/${code}/ws?${params.toString()}`;
}

export class RoomSocket {
  private readonly factory: (url: string) => SocketLike;
  private readonly events: RoomSocketEvents;
  private readonly url: string;
  private ws: SocketLike | null = null;
  private status: ConnectionState = "connecting";
  private attempts = 0;
  private destroyed = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private currentVersion = 0;
  private hasSnapshot = false;
  private moveInflight = false;

  constructor(baseUrl: string, code: string, creds: SessionCredentials, events: RoomSocketEvents, factory?: (url: string) => SocketLike) {
    this.url = toSocketUrl(baseUrl, code, creds);
    this.events = events;
    this.factory =
      factory ??
      ((socketUrl) => new WebSocket(socketUrl) as unknown as SocketLike);
    this.handleOnline = this.handleOnline.bind(this);
    this.handleVisible = this.handleVisible.bind(this);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      document.addEventListener("visibilitychange", this.handleVisible);
    }
  }

  get connection(): ConnectionState {
    return this.status;
  }

  get pendingMove(): boolean {
    return this.moveInflight;
  }

  connect(): void {
    if (this.destroyed) return;
    this.clearRetry();
    this.hasSnapshot = false;
    this.setStatus(this.attempts === 0 ? "connecting" : "reconnecting");
    let ws: SocketLike;
    try {
      ws = this.factory(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws || this.destroyed) return;
      this.attempts = 0;
      this.setStatus("connected");
      this.startHeartbeat();
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      this.handlePayload(event.data);
    };
    ws.onerror = () => {
      // Close always follows error; reconnect is driven from onclose.
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopHeartbeat();
      this.moveInflight = false;
      if (this.destroyed) return;
      if (event && (event as { code?: number }).code === 1000) {
        // Clean close (leave/expired) — do not auto-reconnect.
        this.setStatus("lost");
        return;
      }
      this.scheduleRetry();
    };
  }

  /** User-initiated retry (e.g. after `lost`, or tab becoming visible). */
  retry(): void {
    if (this.destroyed) return;
    this.attempts = 0;
    this.connect();
  }

  sendMove(from: number, to: number): boolean {
    if (!this.send({ type: "move", from, to, moveId: newMoveId(), clientVersion: this.currentVersion })) return false;
    this.moveInflight = true;
    return true;
  }

  sendChat(text: string): boolean {
    return this.send({ type: "chat", text });
  }

  sendRematch(): boolean {
    return this.send({ type: "rematch" });
  }

  /** Graceful exit: tells the room, then closes cleanly (no reconnect). */
  leave(): void {
    this.send({ type: "leave" });
    this.destroyed = true;
    this.clearRetry();
    this.stopHeartbeat();
    try {
      this.ws?.close(1000, "leave");
    } catch {
      /* ignore */
    }
    this.ws = null;
  }

  /** Silent teardown (unmount/refresh path): seat is kept for reconnect. */
  destroy(): void {
    this.destroyed = true;
    this.clearRetry();
    this.stopHeartbeat();
    try {
      this.ws?.close(1000, "teardown");
    } catch {
      /* ignore */
    }
    this.ws = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      document.removeEventListener("visibilitychange", this.handleVisible);
    }
  }

  private send(payload: { readonly type: string; [key: string]: unknown }): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) {
      this.events.onError("not-connected", REALTIME_ERROR_MESSAGES["not-connected"]);
      return false;
    }
    try {
      ws.send(JSON.stringify(payload));
      if (payload.type !== "move") this.requestResyncSoon(payload.type);
      return true;
    } catch {
      this.events.onError("not-connected", REALTIME_ERROR_MESSAGES["not-connected"]);
      return false;
    }
  }

  private requestResyncSoon(_type: string): void {
    // Non-move commands are confirmed via the next broadcast snapshot;
    // nothing extra needed. (Moves clear `moveInflight` the same way.)
  }

  private handlePayload(data: unknown): void {
    let parsed: unknown = data;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return;
      }
    }
    if (!isServerMessage(parsed)) return;
    const message: ServerMessage = parsed;
    if (message.type === "pong") {
      this.clearPongTimeout();
      return;
    }
    if (message.type === "welcome") {
      this.currentVersion = message.version;
      return;
    }
    if (message.type === "error") {
      this.moveInflight = false;
      this.events.onError(message.code, message.message);
      if (message.code === "unauthorized" || message.code === "room-expired") {
        this.destroyed = true;
        this.setStatus("lost");
      }
      return;
    }
    // type === "state": the first snapshot after (re)connect is a full
    // resync and is always accepted; afterwards only strictly newer wins.
    if (message.version > this.currentVersion || !this.hasSnapshot) {
      this.currentVersion = Math.max(this.currentVersion, message.version);
      this.hasSnapshot = true;
      this.moveInflight = false;
      this.events.onSnapshot(message.snapshot);
    }
  }

  private setStatus(status: ConnectionState): void {
    if (this.status === status) return;
    this.status = status;
    this.events.onStatus(status);
  }

  private scheduleRetry(): void {
    if (this.destroyed) return;
    this.clearRetry();
    if (this.attempts >= MAX_AUTO_ATTEMPTS) {
      this.setStatus("lost");
      return;
    }
    const delay = LIMITS.RECONNECT_BACKOFF_MS[Math.min(this.attempts, LIMITS.RECONNECT_BACKOFF_MS.length - 1)];
    this.attempts += 1;
    this.setStatus("reconnecting");
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const ws = this.ws;
      if (!ws || ws.readyState !== OPEN) return;
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        return;
      }
      this.clearPongTimeout();
      this.pongTimer = setTimeout(() => {
        // Half-open socket: force a reconnect cycle.
        try {
          this.ws?.close(4000, "pong timeout");
        } catch {
          /* ignore */
        }
      }, 10_000);
    }, LIMITS.HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  private clearPongTimeout(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private handleOnline(): void {
    if (!this.destroyed && this.status !== "connected") this.retry();
  }

  private handleVisible(): void {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      if (!this.destroyed && this.status !== "connected") this.retry();
    }
  }
}

/* ------------------------------------------------------------------ */
/* REST helpers (create/join/info run over HTTPS)                       */
/* ------------------------------------------------------------------ */

export interface RoomCredentials extends SessionCredentials {
  readonly roomCode: string;
  readonly seat: "red" | "blue";
  readonly socketPath: string;
}

async function rest<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new RealtimeError("server-error");
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const code = (body as { error?: string } | null)?.error;
    if (code && code in REALTIME_ERROR_MESSAGES) {
      throw new RealtimeError(code as RealtimeErrorCode);
    }
    throw new RealtimeError("server-error");
  }
  return body as T;
}

export const realtimeApi = {
  createRoom: (baseUrl: string, name: string, avatar?: string) =>
    rest<RoomCredentials>(baseUrl, "/rooms", { method: "POST", body: JSON.stringify({ name, avatar }) }),
  joinRoom: (baseUrl: string, code: string, name: string, avatar?: string) =>
    rest<RoomCredentials>(baseUrl, `/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ name, avatar }) }),
  roomInfo: (baseUrl: string, code: string) =>
    rest<{ roomCode: string; status: string; hasOpponent: boolean }>(baseUrl, `/rooms/${code}`),
};

export const messageFor = (error: unknown): string =>
  error instanceof RealtimeError ? error.message : REALTIME_ERROR_MESSAGES["server-error"];

/* ------------------------------------------------------------------ */
/* Session persistence (per-tab, like before — no accounts)             */
/* ------------------------------------------------------------------ */

const sessionKey = (code: string) => `crossline:rt:session:${code}`;

export interface StoredSession extends SessionCredentials {
  readonly seat: "red" | "blue";
}

export const rtSession = {
  save(code: string, value: StoredSession) {
    try {
      window.sessionStorage.setItem(sessionKey(code), JSON.stringify(value));
    } catch {
      /* private mode */
    }
  },
  load(code: string): StoredSession | null {
    try {
      const raw = window.sessionStorage.getItem(sessionKey(code));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (
        typeof parsed.playerId !== "string" ||
        typeof parsed.token !== "string" ||
        (parsed.seat !== "red" && parsed.seat !== "blue")
      ) {
        return null;
      }
      return parsed as StoredSession;
    } catch {
      return null;
    }
  },
  clear(code: string) {
    try {
      window.sessionStorage.removeItem(sessionKey(code));
    } catch {
      /* ignore */
    }
  },
};

export function realtimeBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://127.0.0.1:8787";
  }
  // Same-origin fallback (works when Pages Functions route /rooms/* to the Worker).
  if (typeof window !== "undefined") return window.location.origin;
  return "http://127.0.0.1:8787";
}
