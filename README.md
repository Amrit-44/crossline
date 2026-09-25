# CROSSLINE

**Three pieces. One line. Outsmart your rival.**

A fast 1v1 tactical board game on a 3×3 grid. Slide one of your three marks
(X or O) to an adjacent square each turn — horizontally, vertically, or
diagonally. First to line up all three wins.

Play vs Bot (Easy / Medium / Hard — Hard plays perfectly from a solved
table), Local 2-player on one device, or Online with a five-letter room code.

Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
Cloudflare Workers + Durable Objects (realtime rooms) · Vitest**

## Layout

```
src/game/         Pure, deterministic rules engine (no React, no IO)
  types.ts        GameState / Move / MoveRejection
  board.ts        Geometry, lines, adjacency, bitmask helpers
  rules.ts        Initial state, legal moves, validateMove, applyMove, win/draw
  solver.ts       Exact retrograde solver for all 3,360 positions
  bot.ts          Easy (random) · Medium (win/block/avoid) · Hard (solved table)
src/lib/          identity.ts (names/avatars) · sound.ts (Web Audio SFX + ambient)
src/realtime/     Shared protocol + authoritative room state machine + WS client
  protocol.ts     Client/Server messages, limits, error copy (Worker-safe)
  room-core.ts    Pure room state machine (DO calls this; engine validates moves)
  client.ts       Browser WebSocket manager (reconnect, version gating, id keys)
worker/           Cloudflare Worker + CrosslineRoom Durable Object (hibernation WS)
src/hooks/        useOfflineGame · useCrosslineRoom · useBoardInteraction
src/components/   Board, Piece, HUD, modals, chat, lobby, identity, guide, layout
scripts/analyze.ts  Solvability analysis (`npm run analyze`)
scripts/dev-all.mjs One-command local stack (`npm run dev:all`)
docs/BALANCE.md   Results of the analysis and the resulting rule decisions
docs/DEPLOYMENT.md Deployment (Cloudflare Worker + frontend, no DB required)
```

One rules engine powers Local, Bot, and the server. The browser is never
trusted: every online move is re-validated by `applyMove` on the server.

## Rules decisions backed by the solver

* The opening position has both sides already aligned in their home
  columns, so **a player's home column never counts as a win for them**.
* With that clarification the game is a **draw under perfect play** with no
  first-player advantage (every X opening draws; several O replies lose),
  so no swap/pie rule was added.
* Because perfect play never terminates, the **third repetition of a position
  is a draw** (in addition to the no-legal-moves draw, which turns out to
  be geometrically unreachable).

See `docs/BALANCE.md`.

## Online architecture

Rooms live in the `CrosslineRoom` Durable Object — one stateful instance per
room code. Create/join run over HTTPS; gameplay runs over a hibernated
WebSocket, so there is no polling and no database on the multiplayer path.
Session tokens (48 hex chars) plus player ids are issued on create/join and
kept in `sessionStorage` — no cookies, no accounts.

* Every accepted action bumps a monotonic `version`; clients render only the
  newest authoritative snapshot (connect always starts with a full resync).
* Moves carry a client-generated `moveId`; duplicates are acknowledged, never
  re-executed.
* No heartbeat for 6 s → shown as disconnected; the seat is held for a further
  **30 s** with a visible countdown, then the remaining player wins by timeout.
  Reconnecting inside the window restores seat, colour and board with
  exponential backoff (500 ms → 8 s).
* Room states: `waiting → active → finished`, or `expired`; stale rooms are
  reclaimed by DO alarms.
* Chat: 200-character cap, one message per 2 s per seat, enforced server-side,
  over the same socket.
* Because state is in DO storage, games survive Worker restarts.

## Scripts

```
npm run dev        # frontend only (local/bot play)
npm run dev:all    # frontend :3000 + realtime Worker :8787 (full online play)
npm run dev:worker # realtime Worker only
npm test           # engine, bot, identity, realtime room-core
npm run assets       # regenerate PWA/OG/logo variants from crossline-logo.png
npm run analyze    # print the game-theoretic analysis
npm run build      # production build
npm run deploy:worker  # deploy the realtime Worker (wrangler deploy)
```

## Accessibility & UX notes

* Pieces are X vs O (shape + colour: ember vs ice), plus distinct avatars.
* The board is a keyboard-operable grid: arrows move, Enter/Space select & drop,
  Escape cancels. Every cell has a descriptive `aria-label`.
* Reduced motion is honoured via `prefers-reduced-motion` and a manual toggle;
  high-contrast mode and a legal-move highlight toggle live in Settings.
* Sound is synthesised with the Web Audio API (SFX + optional ambient drone);
  nothing autoplays before user interaction.
