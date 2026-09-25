"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/SettingsProvider";
import type { Move } from "@/game/types";
import {
  realtimeApi,
  realtimeBaseUrl,
  RoomSocket,
  rtSession,
  type ConnectionState,
  type StoredSession,
} from "@/realtime/client";
import { RealtimeError, type RealtimeErrorCode, type RoomSnapshot } from "@/realtime/protocol";

export type RoomPhase = "loading" | "no-session" | "ready" | "expired";

interface Failure {
  code: RealtimeErrorCode;
  message: string;
}

/**
 * Client side of a realtime Crossline room. The Durable Object is the only
 * source of truth: this hook holds a persistent WebSocket, renders the
 * newest authoritative snapshot, and never plays optimistic board state.
 */
export function useCrosslineRoom(code: string) {
  const { play } = useSettings();
  const [phase, setPhase] = useState<RoomPhase>(() => {
    if (typeof window === "undefined") return "loading";
    return rtSession.load(code) ? "loading" : "no-session";
  });
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<Failure | null>(null);
  const socketRef = useRef<RoomSocket | null>(null);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const baseUrl = useRef(realtimeBaseUrl());

  const fail = useCallback((error: unknown) => {
    const code = error instanceof RealtimeError ? error.code : "server-error";
    const message = error instanceof RealtimeError ? error.message : "Connection lost. Reconnecting…";
    setLastError({ code, message });
    if (code === "unauthorized" || code === "room-expired" || code === "room-not-found") {
      rtSession.clear(code);
      socketRef.current?.destroy();
      socketRef.current = null;
      setPhase("expired");
    }
  }, [code]);

  const adopt = useCallback(
    (next: RoomSnapshot) => {
      const prev = snapshotRef.current;
      snapshotRef.current = next;
      setSnapshot(next);
      setPhase("ready");
      if (!prev) return;
      const seat = next.seat;
      const prevOpp = seat === "red" ? prev.players.blue : prev.players.red;
      const nextOpp = seat === "red" ? next.players.blue : next.players.red;
      if (!prevOpp && nextOpp) play("join");
      if (prevOpp && nextOpp && prevOpp.connected && !nextOpp.connected) play("disconnect");
      if (prevOpp && nextOpp && !prevOpp.connected && nextOpp.connected) play("join");
      if (next.game.ply === prev.game.ply + 1 && next.game.lastMove && next.game.turn === seat) play("move");
      const lastMsg = next.messages[next.messages.length - 1];
      if (
        lastMsg &&
        lastMsg.from !== "system" &&
        lastMsg.from !== seat &&
        !prev.messages.some((m) => m.id === lastMsg.id)
      ) {
        play("chat");
      }
      if (prev.game.status === "playing" && next.game.status !== "playing") {
        if (next.game.status === "draw") play("draw");
        else play(next.game.winner === seat ? "win" : "draw");
      }
    },
    [play],
  );

  const openSocket = useCallback(
    (stored: StoredSession) => {
      socketRef.current?.destroy();
      const socket = new RoomSocket(
        baseUrl.current,
        code,
        { playerId: stored.playerId, token: stored.token },
        {
          onSnapshot: adopt,
          onStatus: (status) => {
            setConnection(status);
            if (status === "connected") setPending(false);
          },
          onError: (errorCode) => fail(new RealtimeError(errorCode)),
        },
      );
      // RealtimeError constructor takes only code; rebuild to carry the message.
      socketRef.current = socket;
      socket.connect();
    },
    [code, adopt, fail],
  );

  // The socket's onError gives us (code, message); the message is always the
  // standard player-facing copy for the code, so wrap into RealtimeError.
  // (Kept as a callback so the socket never needs React.)
  useEffect(() => {
    const stored = typeof window === "undefined" ? null : rtSession.load(code);
    if (!stored) return;
    openSocket(stored);
    return () => {
      socketRef.current?.destroy();
      socketRef.current = null;
    };
  }, [code, openSocket]);

  const join = useCallback(
    async (name: string, avatar?: string) => {
      setLastError(null);
      setPhase("loading");
      try {
        const result = await realtimeApi.joinRoom(baseUrl.current, code, name, avatar);
        const stored: StoredSession = { playerId: result.playerId, token: result.token, seat: result.seat };
        rtSession.save(code, stored);
        play("join");
        openSocket(stored);
      } catch (error) {
        play("error");
        fail(error);
        setPhase("no-session");
        throw error;
      }
    },
    [code, openSocket, fail, play],
  );

  const move = useCallback(
    async (m: Move): Promise<boolean> => {
      const socket = socketRef.current;
      if (!socket || pending) return false;
      setPending(true);
      play("select");
      const sent = socket.sendMove(m.from, m.to);
      if (!sent) {
        setPending(false);
        return false;
      }
      return true;
    },
    [pending, play],
  );

  const chat = useCallback(
    async (text: string) => {
      const socket = socketRef.current;
      if (!socket) throw new RealtimeError("not-connected");
      if (!socket.sendChat(text)) throw new RealtimeError("not-connected");
    },
    [],
  );

  const rematch = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket || !socket.sendRematch()) fail(new RealtimeError("not-connected"));
  }, [fail]);

  const leave = useCallback(async () => {
    socketRef.current?.leave();
    socketRef.current = null;
    rtSession.clear(code);
  }, [code]);

  const retry = useCallback(() => {
    const stored = rtSession.load(code);
    if (!stored) {
      setPhase("no-session");
      return;
    }
    setPhase("loading");
    openSocket(stored);
  }, [code, openSocket]);

  const clearError = useCallback(() => setLastError(null), []);

  // Pending clears when a newer snapshot arrives (socket owns the flag too).
  useEffect(() => {
    if (snapshot) setPending(socketRef.current?.pendingMove ?? false);
  }, [snapshot]);

  return {
    phase,
    view: snapshot,
    game: snapshot?.game ?? null,
    pending,
    connection,
    reconnecting: connection === "reconnecting",
    lastError,
    clearError,
    join,
    move,
    chat,
    rematch,
    leave,
    retry,
  };
}
