# Deployment — Crossline

Crossline is a Next.js 16 App Router app. The game engine is pure
client-safe code; **online rooms are server-authoritative in a Cloudflare
Durable Object** (`CrosslineRoom`), reached over HTTPS for create/join and
WebSocket for gameplay. No database is on the multiplayer path.

## Local development (no database required)

```bash
npm install
npm run dev:all   # frontend :3000 + realtime Worker :8787 — full online play
```

- `npm run dev` alone runs the frontend (local/bot play works; online room
  create/join needs the realtime Worker too, and shows a specific
  "Connection lost. Reconnecting…" / "room doesn't exist" error — never a
  generic sync failure).
- `npm run dev:worker` runs only the realtime Worker on 127.0.0.1:8787.
- The browser resolves the realtime base URL via `NEXT_PUBLIC_REALTIME_URL`
  when set, else `http://127.0.0.1:8787` on localhost, else same-origin.

## Checks

```bash
npm test           # engine + bot + identity + realtime room-core
npm run typecheck
npm run lint
npm run build
npx wrangler deploy --dry-run   # validate Worker + Durable Object bindings
```

## Brand assets

The primary logo is `public/crossline-logo.png` (never edit by hand).
Derived web assets (PWA icons, Apple touch icon, `og.png` social preview,
lightweight `crossline-logo-512.png` for UI chrome) are generated with:

```bash
npm run assets   # node scripts/generate-assets.mjs (needs `sharp`)
```

All outputs are committed, so a fresh clone builds and deploys without
running it.

## Production (Cloudflare)

1. Deploy the realtime Worker (owns `CrosslineRoom` Durable Objects):

   ```bash
   npm run deploy:worker   # wrangler deploy (see wrangler.jsonc)
   ```

   Note the Worker URL, e.g. `https://crossline-realtime.<you>.workers.dev`.

2. Deploy the Next.js frontend (Cloudflare Pages or any host) with:

   ```bash
   NEXT_PUBLIC_REALTIME_URL=https://crossline-realtime.<you>.workers.dev
   ```

3. `ALLOWED_ORIGINS` on the Worker lists the origins allowed to call the
   realtime REST endpoints from a browser (comma-separated, already set in
   `wrangler.jsonc`). Origins not on the list get no CORS headers, so
   browsers refuse the response; requests without an `Origin` header
   (curl, same-origin, WebSocket upgrades) are unaffected. An empty list
   allows all origins.

Environment:

```bash
# Frontend (.env.local / Pages dashboard)
NEXT_PUBLIC_REALTIME_URL=https://crossline-realtime.<you>.workers.dev

# Worker (wrangler.jsonc vars / dashboard)
ALLOWED_ORIGINS=https://cross-line.pages.dev,http://localhost:3000,http://127.0.0.1:3000
```

There is intentionally **no** database in this project. Multiplayer state
lives in Durable Object storage; dependencies are just Next.js + React +
Tailwind + Vitest (+ `sharp` as a dev tool for brand assets).

## Online architecture (authoritative)

```
browser --HTTPS--> Worker (/rooms, /rooms/:code/join, /rooms/:code)
browser --WebSocket--> Worker (/rooms/:code/ws) --> CrosslineRoom DO
```

- One DO instance per room (`idFromName("room-<CODE>")`); owns players,
  board, turn, version, chat, rematch, presence. Persists to DO storage.
- Every state change bumps `version`; clients render only the newest
  authoritative snapshot (first snapshot after connect is a full resync).
- Moves carry a client-generated `moveId`; replays are deduplicated, never
  executed twice.
- Reconnect: exponential backoff (500ms → 8s), token auth, full `state`
  resync, seat held 30s past the 6s presence timeout.
- Room lifecycle: `waiting → active → finished`, or `expired`; alarms drive
  expiry/forfeit, never per-connection timers.
