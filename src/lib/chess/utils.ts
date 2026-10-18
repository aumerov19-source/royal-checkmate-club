import { Chess, type Color, type PieceSymbol } from "chess.js";

export const START_COUNTS: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Pieces captured BY `color` (i.e. missing opponent pieces), sorted by value. */
export function capturedBy(fen: string, color: Color): PieceSymbol[] {
  const chess = new Chess(fen);
  const opp: Color = color === "w" ? "b" : "w";
  const counts: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const row of chess.board()) for (const p of row) if (p && p.color === opp) counts[p.type] = (counts[p.type] ?? 0) + 1;
  const out: PieceSymbol[] = [];
  (["q", "r", "b", "n", "p"] as PieceSymbol[]).forEach((t) => {
    // promotions can make counts exceed start; clamp at 0
    const missing = Math.max(0, START_COUNTS[t] - (counts[t] ?? 0));
    for (let i = 0; i < missing; i++) out.push(t);
  });
  return out;
}

export function materialDiff(fen: string): number {
  const chess = new Chess(fen);
  let s = 0;
  for (const row of chess.board()) for (const p of row) if (p) s += (p.color === "w" ? 1 : -1) * VALUES[p.type];
  return s;
}

export type GameEnd = { result: "1-0" | "0-1" | "1/2-1/2"; reason: string } | null;

export function detectEnd(chess: Chess): GameEnd {
  if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
  if (chess.isStalemate()) return { result: "1/2-1/2", reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { result: "1/2-1/2", reason: "insufficient material" };
  if (chess.isThreefoldRepetition()) return { result: "1/2-1/2", reason: "threefold repetition" };
  if (chess.isDraw()) return { result: "1/2-1/2", reason: "50-move rule" };
  return null;
}

export function findKingSquare(chess: Chess, color: Color): string | null {
  const b = chess.board();
  for (const row of b) for (const p of row) if (p && p.type === "k" && p.color === color) return p.square;
  return null;
}

export function formatClock(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  if (t < 10000) return `${s}.${Math.floor((t % 1000) / 100)}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function resultText(result: string | null | undefined, reason?: string | null) {
  if (!result) return "";
  const who = result === "1-0" ? "White wins" : result === "0-1" ? "Black wins" : "Draw";
  return reason ? `${who} by ${reason}` : who;
}
