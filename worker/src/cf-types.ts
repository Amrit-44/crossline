/**
 * Minimal Cloudflare Workers / Durable Objects type surface used by the
 * Crossline realtime Worker. Hand-written (instead of pulling
 * `@cloudflare/workers-types`) so `tsc` never fights the DOM lib, and so
 * this file documents exactly which runtime APIs we depend on.
 *
 * Runtime note: `WebSocket`, `Request`, `Response`, `crypto` come from the
 * standard lib; only the hibernation + storage + namespace hooks below are
 * Cloudflare-specific.
 */

export interface HibernatableWebSocket extends WebSocket {
  serializeAttachment(data: unknown): void;
  deserializeAttachment(): unknown;
}

export interface DurableObjectStorageLike {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  deleteAll(): Promise<void>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  getAlarm(): Promise<number | null>;
}

export interface DurableObjectStateLike {
  readonly storage: DurableObjectStorageLike;
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): HibernatableWebSocket[];
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  waitUntil(promise: Promise<unknown>): void;
}

export interface DurableObjectIdLike {
  toString(): string;
}

export interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectNamespaceLike {
  idFromName(name: string): DurableObjectIdLike;
  get(id: DurableObjectIdLike): DurableObjectStubLike;
}

export interface CrosslineEnv {
  CROSSLINE_ROOMS: DurableObjectNamespaceLike;
  /** Comma-separated extra allowed CORS origins (prod Pages URL goes here). */
  ALLOWED_ORIGINS?: string;
}

/** Attachment pinned to every accepted socket (hibernation-safe). */
export interface SocketAttachment {
  readonly playerId: string;
  readonly seat: "red" | "blue";
}

/** Cloudflare runtime global (not in the DOM lib): `new WebSocketPair()`. */
declare global {
  interface WebSocketPair {
    readonly 0: WebSocket;
    readonly 1: WebSocket;
  }
  var WebSocketPair: new () => WebSocketPair;
}
