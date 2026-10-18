import { Chess } from "chess.js";
import { detectEnd } from "./utils";

export type OnlineGame = {
  white_id: string | null;
  black_id: string | null;
  fen: string;
  moves: unknown;
  status: string;
  result: string | null;
  white_ms: number;
  black_ms: number;
  turn_started_at: string | null;
  version: number;
};

export type GameUpdate = {
  fen: string;
  moves: string[];
  status: string;
  result: string | null;
  result_reason: string | null;
  white_ms: number;
  black_ms: number;
  turn_started_at: string | null;
  version: number;
  updated_at: string;
};

/** Rebuilds the full game (for repetition detection) from the SAN list. */
export function replay(moves: string[]): Chess {
  const c = new Chess();
  for (const san of moves) c.move(san);
  return c;
}

function clocks(g: OnlineGame, now: number) {
  const elapsed = g.turn_started_at ? Math.max(0, now - new Date(g.turn_started_at).getTime()) : 0;
  const turn = g.fen.split(" ")[1] as "w" | "b";
  return {
    turn,
    white: turn === "w" ? g.white_ms - elapsed : g.white_ms,
    black: turn === "b" ? g.black_ms - elapsed : g.black_ms,
  };
}

type Result = { ok: true; update: GameUpdate } | { ok: false; error: string };

export function applyOnlineMove(
  g: OnlineGame,
  userId: string,
  mv: { from: string; to: string; promotion?: string | undefined },
  now: number,
): Result {
  if (g.status !== "active") return { ok: false, error: "Game is not active" };
  const color = g.white_id === userId ? "w" : g.black_id === userId ? "b" : null;
  if (!color) return { ok: false, error: "You are not a player in this game" };
  const moves = Array.isArray(g.moves) ? (g.moves as string[]) : [];
  const chess = replay(moves);
  if (chess.turn() !== color) return { ok: false, error: "Not your turn" };
  const c = clocks(g, now);
  const base = { version: g.version + 1, updated_at: new Date(now).toISOString() };
  const myLeft = color === "w" ? c.white : c.black;
  if (myLeft <= 0) {
    return {
      ok: true,
      update: {
        ...base, fen: g.fen, moves, status: "finished",
        result: color === "w" ? "0-1" : "1-0", result_reason: "timeout",
        white_ms: Math.max(0, c.white), black_ms: Math.max(0, c.black), turn_started_at: null,
      },
    };
  }
  let played;
  try {
    played = chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? "q" });
  } catch {
    return { ok: false, error: "Illegal move" };
  }
  const end = detectEnd(chess);
  return {
    ok: true,
    update: {
      ...base,
      fen: chess.fen(),
      moves: [...moves, played.san],
      status: end ? "finished" : "active",
      result: end?.result ?? null,
      result_reason: end?.reason ?? null,
      white_ms: Math.max(0, Math.round(c.white)),
      black_ms: Math.max(0, Math.round(c.black)),
      turn_started_at: end ? null : new Date(now).toISOString(),
    },
  };
}

/** Returns a finishing update if the side to move has run out of time. */
export function checkTimeout(g: OnlineGame, now: number): GameUpdate | null {
  if (g.status !== "active") return null;
  const c = clocks(g, now);
  const left = c.turn === "w" ? c.white : c.black;
  if (left > 0) return null;
  return {
    fen: g.fen, moves: (g.moves as string[]) ?? [], status: "finished",
    result: c.turn === "w" ? "0-1" : "1-0", result_reason: "timeout",
    white_ms: Math.max(0, Math.round(c.white)), black_ms: Math.max(0, Math.round(c.black)),
    turn_started_at: null, version: g.version + 1, updated_at: new Date(now).toISOString(),
  };
}

export function eloUpdate(ra: number, rb: number, scoreA: number, k = 32): [number, number] {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  const da = Math.round(k * (scoreA - ea));
  return [ra + da, rb - da];
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeRoomCode(rand = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return s;
}
