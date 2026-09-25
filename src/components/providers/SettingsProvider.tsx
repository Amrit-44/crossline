"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { isMusicPlaying, playSound, startMusic, stopMusic, type SoundKind } from "@/lib/sound";

export interface Settings {
  sound: boolean;
  sfx: boolean;
  music: boolean;
  muted: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  showLegalMoves: boolean;
  displayName: string;
}

const DEFAULTS: Settings = {
  sound: true,
  sfx: true,
  music: false,
  muted: false,
  reducedMotion: false,
  highContrast: false,
  showLegalMoves: true,
  displayName: "",
};
const STORAGE_KEY = "crossline:settings:v1";
const LEGACY_KEY = "baghchal:settings";

let snapshot: Settings | null = null;
const listeners = new Set<() => void>();

function read(): Settings {
  if (snapshot) return snapshot;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    snapshot = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    snapshot = DEFAULTS;
  }
  applyDom(snapshot);
  return snapshot;
}

function applyDom(value: Settings) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.reducedMotion = value.reducedMotion ? "true" : "false";
  document.documentElement.dataset.highContrast = value.highContrast ? "true" : "false";
}

function write(value: Settings) {
  snapshot = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  applyDom(value);
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  play: (kind: SoundKind) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULTS);

  const update = useCallback((patch: Partial<Settings>) => write({ ...read(), ...patch }), []);
  const reset = useCallback(() => {
    if (isMusicPlaying()) stopMusic();
    write(DEFAULTS);
  }, []);
  const play = useCallback(
    (kind: SoundKind) => {
      const s = read();
      if (s.muted || !s.sound || !s.sfx) return;
      playSound(kind);
    },
    [],
  );

  // Sync ambient music with settings (starts only after user interaction creates context).
  useEffect(() => {
    if (settings.muted || !settings.music) {
      if (isMusicPlaying()) stopMusic();
    }
  }, [settings.muted, settings.music]);

  const value = useMemo(() => ({ settings, update, reset, play }), [settings, update, reset, play]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function toggleMusicExplicitly(enable: boolean): void {
  if (enable) startMusic();
  else stopMusic();
}
