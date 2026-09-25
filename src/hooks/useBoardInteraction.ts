"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BOARD_SIZE, CELL_COUNT, colOf, indexOf, rowOf } from "@/game/board";
import { getLegalDestinations, validateMove } from "@/game/rules";
import type { GameState, Move, MoveRejection } from "@/game/types";

export type RejectionFeedback = MoveRejection | "locked";

interface Options {
  state: GameState;
  /** True when the local user is allowed to act on the current turn. */
  canAct: boolean;
  onMove: (move: Move) => void;
  onSelect?: () => void;
  onReject?: (reason: RejectionFeedback) => void;
}

const SHAKE_MS = 380;

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export function useBoardInteraction({ state, canAct, onMove, onSelect, onReject }: Options) {
  // Selection is keyed to the position it was made in, so any new ply
  // (or game reset) drops it without needing an effect.
  const [selection, setSelection] = useState<{ key: string; index: number } | null>(null);
  const positionKey = `${state.ply}:${state.status}:${state.history.length}`;
  const selected = selection && selection.key === positionKey ? selection.index : null;
  const setSelected = useCallback(
    (index: number | null) => setSelection(index === null ? null : { key: positionKey, index }),
    [positionKey],
  );
  const [focusIndex, setFocusIndex] = useState<number>(() =>
    state.board.findIndex((cell) => cell === state.turn),
  );
  const [shaking, setShaking] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shakeTimer = useRef<number | null>(null);

  const validTargets = selected === null ? [] : getLegalDestinations(state.board, selected);

  useEffect(
    () => () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  const reject = useCallback(
    (index: number, reason: RejectionFeedback) => {
      setShaking(index);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShaking(null), SHAKE_MS);
      onReject?.(reason);
    },
    [onReject],
  );

  const activate = useCallback(
    (index: number) => {
      setFocusIndex(index);
      if (state.status !== "playing") return reject(index, "game-over");
      if (!canAct) return reject(index, "locked");

      const content = state.board[index];
      if (selected === null) {
        if (content === state.turn) {
          setSelected(index);
          onSelect?.();
        } else if (content === null) {
          reject(index, "empty-source");
        } else {
          reject(index, "not-your-piece");
        }
        return;
      }

      if (index === selected) {
        setSelected(null);
        return;
      }
      if (content === state.turn) {
        setSelected(index);
        onSelect?.();
        return;
      }
      const move: Move = { from: selected, to: index };
      const rejection = validateMove(state, move);
      if (rejection) return reject(index, rejection);
      setSelected(null);
      onMove(move);
    },
    [state, canAct, selected, setSelected, reject, onMove, onSelect],
  );

  const registerCell = useCallback((index: number, el: HTMLButtonElement | null) => {
    cellRefs.current[index] = el;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        setSelected(null);
        return;
      }
      const delta = ARROWS[event.key];
      if (!delta) return;
      event.preventDefault();
      const row = Math.min(BOARD_SIZE - 1, Math.max(0, rowOf(focusIndex) + delta[0]));
      const col = Math.min(BOARD_SIZE - 1, Math.max(0, colOf(focusIndex) + delta[1]));
      const next = indexOf(row, col);
      if (next !== focusIndex && next >= 0 && next < CELL_COUNT) {
        setFocusIndex(next);
        cellRefs.current[next]?.focus();
      }
    },
    [focusIndex, setSelected],
  );

  return {
    selected,
    validTargets,
    focusIndex,
    shaking,
    activate,
    registerCell,
    handleKeyDown,
    clearSelection: () => setSelected(null),
  };
}
