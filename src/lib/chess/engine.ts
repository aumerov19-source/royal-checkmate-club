import { Chess, type Move } from "chess.js";

export type Level = 1 | 2 | 3 | 4;
export const LEVELS: { level: Level; name: string; desc: string; rating: number }[] = [
  { level: 1, name: "Squire", desc: "Learning the moves", rating: 600 },
  { level: 2, name: "Knight", desc: "Casual player", rating: 1000 },
  { level: 3, name: "Bishop", desc: "Club strength", rating: 1400 },
  { level: 4, name: "Monarch", desc: "Thinks deeply", rating: 1800 },
];

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Piece-square tables from white's perspective (a8..h8 first row)
const PST: Record<string, number[]> = {
  p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20],
};

/** Static evaluation from white's point of view, in centipawns. */
export function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r]![f];
      if (!p) continue;
      const idx = p.color === "w" ? r * 8 + f : (7 - r) * 8 + f;
      const v = VAL[p.type]! + PST[p.type]![idx]!;
      score += p.color === "w" ? v : -v;
    }
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => score(b) - score(a));
  function score(m: Move) {
    let s = 0;
    if (m.captured) s += 10 * VAL[m.captured]! - VAL[m.piece]!;
    if (m.promotion) s += VAL[m.promotion]!;
    if (m.san.includes("+")) s += 50;
    return s;
  }
}

const MATE = 100000;

function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number, deadline: number): number {
  if (chess.isCheckmate()) return -MATE + ply;
  if (chess.isDraw()) return 0;
  if (depth === 0 || Date.now() > deadline) {
    const e = evaluate(chess);
    return chess.turn() === "w" ? e : -e;
  }
  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const v = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, deadline);
    chess.undo();
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

export type EngineMove = { from: string; to: string; promotion?: string | undefined };

/** Picks a move for the side to move. Deterministic except level 1 and tie-breaks. */
export function findBestMove(fen: string, level: Level, timeMs = 2500, rand = Math.random): EngineMove | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const depth = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
  const noise = level === 1 ? 250 : level === 2 ? 40 : 0;
  const deadline = Date.now() + timeMs;
  let bestScore = -Infinity;
  let best: Move[] = [];
  for (const m of orderMoves(moves)) {
    chess.move(m);
    let v = -negamax(chess, depth - 1, -Infinity, Infinity, 1, deadline);
    chess.undo();
    if (noise) v += (rand() - 0.5) * noise;
    if (v > bestScore + 0.5) { bestScore = v; best = [m]; }
    else if (Math.abs(v - bestScore) <= 0.5) best.push(m);
  }
  const pick = best[Math.floor(rand() * best.length)]!;
  return { from: pick.from, to: pick.to, promotion: pick.promotion };
}
