"use client";

import { useState, useCallback, useRef } from "react";

const MAX_HISTORY = 100;

// Generic undo/redo state hook. `commit` pushes a new entry onto the history stack
// (use for discrete edits — drag end, delete, insert). `setLive` replaces the current
// top-of-stack entry without pushing (use while a drag/resize is still in-flight, so
// intermediate frames don't each become their own undo step).
//
// `lastCommitted` tracks the state as of the last real commit, separate from `state`
// itself — `state` can drift during a live-drag sequence via `setLive`, and if `commit`
// snapshotted `state` at that point it would push the (already-moved) live position as
// the "undo to" target instead of the true pre-drag position, making undo a no-op.
export function useHistoryState<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const lastCommitted = useRef<T>(initial);
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);

  const commit = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      undoStack.current = [...undoStack.current, lastCommitted.current].slice(-MAX_HISTORY);
      redoStack.current = [];
      lastCommitted.current = resolved;
      return resolved;
    });
  }, []);

  const setLive = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => (typeof next === "function" ? (next as (prev: T) => T)(prev) : next));
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      const last = undoStack.current.pop();
      if (last === undefined) return prev;
      redoStack.current = [...redoStack.current, lastCommitted.current];
      lastCommitted.current = last;
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const next = redoStack.current.pop();
      if (next === undefined) return prev;
      undoStack.current = [...undoStack.current, lastCommitted.current];
      lastCommitted.current = next;
      return next;
    });
  }, []);

  // Reinitializes state without recording an undo step — for seeding data on load,
  // not for edits.
  const reset = useCallback((next: T) => {
    undoStack.current = [];
    redoStack.current = [];
    lastCommitted.current = next;
    setState(next);
  }, []);

  return {
    state,
    commit,
    setLive,
    undo,
    redo,
    reset,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
