/**
 * Crossline realtime Worker — HTTP router in front of `CrosslineRoom` DOs.
 *
 * - POST /rooms            → create room (creator = X)
 * - POST /rooms/:code/join → join room (joiner = O)
 * - GET  /rooms/:code      → public room info (for join pages)
 * - *    /rooms/:code/ws   → WebSocket upgrade, forwarded to the room DO
 * - GET  /health            → liveness
 *
 * Room codes address DOs by name (`idFromName`), so any Worker isolate in
 * the world routes the same code to the same single-threaded room.
 */
import { normalizeCode, ROOM_CODE_ALPHABET, RealtimeError, sanitizeAvatar, sanitizeName } from "../../src/realtime/protocol";
import type { CrosslineEnv } from "./cf-types";
import { CrosslineRoom } from "./room";

const CREATE_ATTEMPTS = 5;

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let code = "";
  for (const b of bytes) code += ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length];
  return code;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function corsHeaders(request: Request, env: CrosslineEnv): { allowed: boolean; headers: Record<string, string> } {
  const origin = request.headers.get("Origin");
  const extra = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowed = !origin || extra.length === 0 || extra.includes("*") || extra.includes(origin);
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  // Denied origins get NO allow-origin header, so browsers refuse to read
  // the response. (Non-browser clients send no Origin and are unaffected.)
  if (allowed) headers["access-control-allow-origin"] = origin ?? "*";
  return { allowed, headers };
}

const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...cors },
  });

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 4_096) throw new RealtimeError("bad-request");
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

const errorStatus = (code: string): number => {
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
    default:
      return 400;
  }
};

function stubFor(env: CrosslineEnv, code: string) {
  return env.CROSSLINE_ROOMS.get(env.CROSSLINE_ROOMS.idFromName(`room-${code}`));
}

async function createRoom(request: Request, env: CrosslineEnv, cors: Record<string, string>): Promise<Response> {
  const body = await readJson(request);
  const name = sanitizeName(body.name);
  const avatar = body.avatar === undefined ? undefined : sanitizeAvatar(body.avatar);
  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
    const code = randomCode();
    const playerId = randomId();
    const token = randomToken();
    const res = await stubFor(env, code).fetch(
      new Request(`https://room/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, playerId, token, name, avatar }),
      }),
    );
    if (res.status === 409) continue; // code collision — retry with a fresh code
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return json({ error: data?.error ?? "server-error" }, res.status, cors);
    }
    console.log(`[worker] ROOM_CREATED ${code} seat=red`);
    return json(
      { roomCode: code, playerId, token, seat: "red", socketPath: `/rooms/${code}/ws` },
      201,
      cors,
    );
  }
  return json({ error: "server-error" }, 500, cors);
}

async function joinRoom(
  request: Request,
  env: CrosslineEnv,
  code: string,
  cors: Record<string, string>,
): Promise<Response> {
  const normalized = normalizeCode(code);
  const body = await readJson(request);
  const name = sanitizeName(body.name);
  const avatar = body.avatar === undefined ? undefined : sanitizeAvatar(body.avatar);
  const playerId = randomId();
  const token = randomToken();
  const res = await stubFor(env, normalized).fetch(
    new Request(`https://room/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId, token, name, avatar }),
    }),
  );
  const data = (await res.json().catch(() => null)) as { error?: string; seat?: string } | null;
  if (!res.ok) return json({ error: data?.error ?? "server-error" }, res.status, cors);
  console.log(`[worker] PLAYER_JOINED ${normalized} seat=${data?.seat}`);
  return json(
    { roomCode: normalized, playerId, token, seat: data?.seat ?? "blue", socketPath: `/rooms/${normalized}/ws` },
    200,
    cors,
  );
}

export default {
  async fetch(request: Request, env: CrosslineEnv): Promise<Response> {
    const { allowed, headers: cors } = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return json({ ok: true }, 200, cors);
      }
      if (url.pathname === "/rooms" && request.method === "POST") {
        return await createRoom(request, env, cors);
      }
      const roomMatch = url.pathname.match(/^\/rooms\/([A-Za-z0-9]+)(\/join|\/ws)?$/);
      if (roomMatch) {
        const [, rawCode, suffix] = roomMatch;
        const code = normalizeCode(rawCode);
        if (suffix === "/join" && request.method === "POST") {
          return await joinRoom(request, env, code, cors);
        }
        if (suffix === "/ws") {
          // Forward the upgrade untouched; the DO answers 101 itself.
          return await stubFor(env, code).fetch(request);
        }
        if (!suffix && request.method === "GET") {
          const res = await stubFor(env, code).fetch(new Request("https://room/peek"));
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            const error = (data as { error?: string } | null)?.error ?? "server-error";
            return json({ error }, res.status, cors);
          }
          return json(data, 200, cors);
        }
      }
      return json({ error: "bad-request" }, 404, cors);
    } catch (error) {
      if (error instanceof RealtimeError) return json({ error: error.code }, errorStatus(error.code), cors);
      console.error("[worker] unexpected error", error);
      return json({ error: "server-error" }, 500, cors);
    }
  },
};

export { CrosslineRoom };
