/**
 * CrosslineRoom — one Durable Object instance per game room.
 *
 * The single-threaded coordinator for a match: owns authoritative state,
 * serializes every mutation, persists to DO storage, and pushes snapshots
 * over hibernated WebSockets. No polling, no database round-trips per move.
 */
import {
  applyClientMessage,
  connectPlayerCore,
  createRoomCore,
  disconnectPlayerCore,
  errorMessage,
  isCleanupEligible,
  joinRoomCore,
  reconcileCore,
  snapshotOf,
  stateMessage,
  welcomeMessage,
  type RoomCore,
} from "../../src/realtime/room-core";
import {
  LIMITS,
  normalizeCode,
  parseClientMessage,
  RealtimeError,
  REALTIME_ERROR_MESSAGES,
  sanitizeAvatar,
  sanitizeName,
  type ClientMessage,
  type RealtimeErrorCode,
  type Seat,
  type ServerMessage,
} from "../../src/realtime/protocol";
import type {
  DurableObjectStateLike,
  HibernatableWebSocket,
  SocketAttachment,
} from "./cf-types";

const STORAGE_KEY = "room";

const log = (code: string, event: string, detail?: string) =>
  console.log(`[room ${code}] ${event}${detail ? ` ${detail}` : ""}`);

let ids = 0;
const newId = () =>
  typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `id-${Date.now()}-${++ids}`;

const errorStatus = (code: RealtimeErrorCode): number => {
  switch (code) {
    case "room-not-found":
      return 404;
    case "room-full":
      return 409;
    case "room-expired":
      return 410;
    case "unauthorized":
      return 401;
    case "rate-limited":
      return 429;
    case "server-error":
      return 500;
    default:
      return 400;
  }
};

const json = (body: unknown, status = 200, extra?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > LIMITS.MAX_MESSAGE_BYTES) throw new RealtimeError("bad-request");
  const text = await request.text();
  if (text.length > LIMITS.MAX_MESSAGE_BYTES) throw new RealtimeError("bad-request");
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RealtimeError("bad-request");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RealtimeError) throw error;
    throw new RealtimeError("bad-request");
  }
}

export class CrosslineRoom {
  private state: DurableObjectStateLike;
  private room: RoomCore | null = null;
  private loaded = false;

  constructor(state: DurableObjectStateLike) {
    this.state = state;
  }

  private async load(): Promise<RoomCore | null> {
    if (!this.loaded) {
      const stored = (await this.state.storage.get<RoomCore>(STORAGE_KEY)) ?? null;
      // Forward-fill rooms persisted before idempotency tracking existed.
      this.room =
        stored && !Array.isArray((stored as Partial<RoomCore>).processedMoves)
          ? { ...stored, processedMoves: [] }
          : stored;
      this.loaded = true;
    }
    return this.room;
  }

  private async persist(): Promise<void> {
    if (!this.room) return;
    await this.state.storage.put(STORAGE_KEY, this.room);
    await this.scheduleAlarm();
  }

  /** Next wake-up: soonest seat deadline / TTL, so expiry never needs a loop. */
  private async scheduleAlarm(): Promise<void> {
    if (!this.room) return;
    const now = Date.now();
    let at: number;
    if (this.room.status === "waiting") {
      at = this.room.createdAt + LIMITS.WAITING_TTL_MS;
    } else if (this.room.status === "finished" || this.room.status === "expired") {
      at = this.room.updatedAt + LIMITS.FINISHED_TTL_MS;
    } else {
      const seats = [this.room.red, this.room.blue].filter((s) => s && !s.left);
      at =
        seats.length > 0
          ? Math.min(...seats.map((s) => s!.lastSeen + LIMITS.PRESENCE_TIMEOUT_MS + LIMITS.RECONNECT_WINDOW_MS))
          : now + LIMITS.WAITING_TTL_MS;
    }
    await this.state.storage.setAlarm(Math.max(now + 1_000, at));
  }

  /* ---------------- internal (Worker → DO) routes ---------------- */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname.endsWith("/create")) {
        return await this.handleCreate(await readJson(request));
      }
      if (request.method === "POST" && url.pathname.endsWith("/join")) {
        return await this.handleJoin(await readJson(request));
      }
      if (request.method === "GET" && url.pathname.endsWith("/peek")) {
        return await this.handlePeek();
      }
      if (url.pathname.endsWith("/ws")) {
        return await this.handleSocket(request, url);
      }
      return json({ error: "bad-request" }, 404);
    } catch (error) {
      if (error instanceof RealtimeError) {
        return json({ error: error.code }, errorStatus(error.code));
      }
      console.error("[room] unexpected error", error);
      return json({ error: "server-error" satisfies RealtimeErrorCode }, 500);
    }
  }

  private async handleCreate(body: Record<string, unknown>): Promise<Response> {
    if (await this.load()) return json({ error: "room-full" satisfies RealtimeErrorCode }, 409);
    const code = normalizeCode(body.code);
    const { playerId, token, name, avatar } = this.playerFields(body);
    const room = createRoomCore(
      code,
      { playerId, token },
      sanitizeName(name),
      avatar === undefined ? undefined : sanitizeAvatar(avatar),
      Date.now(),
      newId,
    );
    this.room = room;
    await this.persist();
    log(code, "ROOM_CREATED", "seat=red");
    return json({ ok: true, version: room.version }, 201);
  }

  private async handleJoin(body: Record<string, unknown>): Promise<Response> {
    const room = await this.load();
    if (!room) return json({ error: "room-not-found" satisfies RealtimeErrorCode }, 404);
    try {
      const { playerId, token, name, avatar } = this.playerFields(body);
      const { core, seat } = joinRoomCore(
        room,
        { playerId, token },
        sanitizeName(name),
        avatar === undefined ? undefined : sanitizeAvatar(avatar),
        Date.now(),
        newId,
      );
      this.room = core;
      await this.persist();
      this.broadcast();
      log(core.code, "PLAYER_JOINED", `seat=${seat}`);
      return json({ ok: true, seat, version: core.version });
    } catch (error) {
      if (error instanceof RealtimeError) return json({ error: error.code }, errorStatus(error.code));
      throw error;
    }
  }

  private async handlePeek(): Promise<Response> {
    const room = await this.load();
    if (!room) return json({ error: "room-not-found" satisfies RealtimeErrorCode }, 404);
    const now = Date.now();
    const reconciled = reconcileCore(room, now);
    if (reconciled !== room) {
      this.room = reconciled;
      await this.persist();
    }
    return json({ roomCode: room.code, status: this.room!.status, hasOpponent: this.room!.blue !== null });
  }

  private playerFields(body: Record<string, unknown>): {
    playerId: string;
    token: string;
    name: unknown;
    avatar: unknown;
  } {
    const { playerId, token, name, avatar } = body;
    if (typeof playerId !== "string" || !playerId || playerId.length > 64) throw new RealtimeError("bad-request");
    if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) throw new RealtimeError("bad-request");
    return { playerId, token, name, avatar };
  }

  /* ---------------- WebSocket (hibernation API) ---------------- */

  private async handleSocket(request: Request, url: URL): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "bad-request" satisfies RealtimeErrorCode }, 426);
    }
    const room = await this.load();
    if (!room) return json({ error: "room-not-found" satisfies RealtimeErrorCode }, 404);
    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    let seat: Seat;
    try {
      const connected = connectPlayerCore(room, playerId, token, Date.now(), newId);
      this.room = connected.core;
      seat = connected.seat;
      await this.persist();
    } catch (error) {
      if (error instanceof RealtimeError) return json({ error: error.code }, errorStatus(error.code));
      throw error;
    }
    const pair = new WebSocketPair();
    const client = pair[0] as unknown as WebSocket;
    const server = pair[1] as unknown as HibernatableWebSocket;
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ playerId, seat } satisfies SocketAttachment);
    // Snapshot goes out on the next tick so the 101 can complete first.
    this.state.waitUntil(
      (async () => {
        this.sendTo(server, welcomeMessage(seat, playerId, this.room!.version));
        this.sendSnapshot(server, seat);
        this.broadcast(server);
      })().catch((error) => console.error("[room] post-accept error", error)),
    );
    log(room.code, "WS_CONNECTED", `seat=${seat}`);
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  private sendTo(ws: HibernatableWebSocket, message: ServerMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[room] send failed", error);
    }
  }

  private sendSnapshot(ws: HibernatableWebSocket, seat: Seat): void {
    if (!this.room) return;
    this.sendTo(ws, stateMessage(snapshotOf(this.room, seat, Date.now())));
  }

  /** Full authoritative snapshot to every connected socket (per-seat view). */
  private broadcast(except?: HibernatableWebSocket): void {
    if (!this.room) return;
    for (const ws of this.state.getWebSockets()) {
      if (except && ws === except) continue;
      try {
        const attachment = ws.deserializeAttachment() as SocketAttachment | null;
        if (!attachment) continue;
        this.sendSnapshot(ws, attachment.seat);
      } catch {
        /* attachment unreadable — skip */
      }
    }
  }

  async webSocketMessage(ws: HibernatableWebSocket, raw: string | ArrayBuffer): Promise<void> {
    const room = await this.load();
    if (!room) {
      this.sendTo(ws, { type: "error", code: "room-expired", message: REALTIME_ERROR_MESSAGES["room-expired"] });
      return;
    }
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    if (text.length > LIMITS.MAX_MESSAGE_BYTES) {
      this.sendTo(ws, { type: "error", code: "bad-request", message: REALTIME_ERROR_MESSAGES["bad-request"] });
      return;
    }
    let attachment: SocketAttachment;
    try {
      attachment = ws.deserializeAttachment() as SocketAttachment;
      if (!attachment?.playerId) throw new Error("no attachment");
    } catch {
      this.sendTo(ws, { type: "error", code: "unauthorized", message: REALTIME_ERROR_MESSAGES.unauthorized });
      return;
    }
    let message: ClientMessage;
    try {
      message = parseClientMessage(text);
    } catch (error) {
      const code = error instanceof RealtimeError ? error.code : "bad-request";
      this.sendTo(ws, { type: "error", code, message: REALTIME_ERROR_MESSAGES[code] });
      return;
    }
    // Resolve the sender's token from authoritative state (never from the client).
    const slot = attachment.seat === "red" ? room.red : room.blue;
    if (!slot || slot.id !== attachment.playerId) {
      this.sendTo(ws, { type: "error", code: "unauthorized", message: REALTIME_ERROR_MESSAGES.unauthorized });
      return;
    }
    const now = Date.now();
    const outcome = applyClientMessage(room, attachment.playerId, slot.token, message, now, newId);
    this.room = outcome.core;
    await this.persist();
    if (message.type === "move") {
      log(room.code, outcome.senderError ? "MOVE_REJECTED" : "MOVE_ACCEPTED", `seat=${attachment.seat}`);
    }
    if (outcome.senderError) {
      const err = outcome.senderError;
      this.sendTo(ws, { type: "error", code: err.code, message: err.message });
      // Presence may still have changed (reconcile/forfeit) → resync everyone.
      if (outcome.core.version !== room.version) this.broadcast();
      return;
    }
    if (message.type === "ping") {
      this.sendTo(ws, { type: "pong" });
      return;
    }
    if (message.type === "request_state") {
      this.sendSnapshot(ws, attachment.seat);
      return;
    }
    this.broadcast();
  }

  async webSocketClose(ws: HibernatableWebSocket, code: number, _reason: string, _wasClean: boolean): Promise<void> {
    const room = await this.load();
    if (!room) return;
    let attachment: SocketAttachment | null = null;
    try {
      attachment = ws.deserializeAttachment() as SocketAttachment;
    } catch {
      return;
    }
    if (!attachment?.playerId) return;
    this.room = disconnectPlayerCore(room, attachment.playerId, Date.now());
    await this.persist();
    this.broadcast();
    log(room.code, "WS_DISCONNECTED", `seat=${attachment.seat} code=${code}`);
  }

  async webSocketError(ws: HibernatableWebSocket, error: unknown): Promise<void> {
    console.error("[room] socket error", error);
    try {
      ws.close(1011, "internal error");
    } catch {
      /* already gone */
    }
  }

  async alarm(): Promise<void> {
    const room = await this.load();
    if (!room) return;
    const now = Date.now();
    const reconciled = reconcileCore(room, now);
    if (reconciled !== room) {
      this.room = reconciled;
      await this.persist();
      this.broadcast();
      log(room.code, "RECONCILE", `status=${reconciled.status}`);
    }
    if (isCleanupEligible(this.room!, now)) {
      const code = this.room!.code;
      for (const ws of this.state.getWebSockets()) {
        try {
          this.sendTo(ws, {
            type: "error",
            code: "room-expired",
            message: REALTIME_ERROR_MESSAGES["room-expired"],
          });
          ws.close(1000, "room expired");
        } catch {
          /* ignore */
        }
      }
      await this.state.storage.deleteAll();
      this.room = null;
      this.loaded = false;
      log(code, "ROOM_EXPIRED");
      return;
    }
    await this.scheduleAlarm();
  }
}
