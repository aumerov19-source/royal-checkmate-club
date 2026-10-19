import { useSyncExternalStore } from "react";

export type BoardTheme = "jungle" | "royal" | "walnut" | "ivory" | "midnight" | "emerald";
export type Settings = {
  boardTheme: BoardTheme;
  sound: boolean;
  showLegal: boolean;
  animations: boolean;
  coordinates: boolean;
};

export const BOARD_THEMES: { id: BoardTheme; name: string }[] = [
  { id: "jungle", name: "Jungle wood" },
  { id: "royal", name: "Royal" },
  { id: "walnut", name: "Walnut" },
  { id: "ivory", name: "Ivory (light)" },
  { id: "midnight", name: "Midnight (dark)" },
  { id: "emerald", name: "Emerald" },
];

const DEFAULTS: Settings = { boardTheme: "jungle", sound: true, showLegal: true, animations: true, coordinates: true };
const KEY = "royal-chess-settings";
let current: Settings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
}

export function getSettings(): Settings {
  load();
  return current;
}

export function updateSettings(patch: Partial<Settings>) {
  load();
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    getSettings,
    () => DEFAULTS,
  );
}
