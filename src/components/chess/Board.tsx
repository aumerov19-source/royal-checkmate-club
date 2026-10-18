import { Chess, type Color, type Square } from "chess.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";
import { findKingSquare } from "@/lib/chess/utils";
import { cn } from "@/lib/utils";

type TrackedPiece = { id: string; sq: string; code: string };
const FILES = "abcdefgh";
let idSeq = 0;

function piecesFromFen(fen: string): { sq: string; code: string }[] {
  const out: { sq: string; code: string }[] = [];
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, ri) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += Number(ch); continue; }
      const color = ch === ch.toUpperCase() ? "w" : "b";
      out.push({ sq: `${FILES[f]}${8 - ri}`, code: color + ch.toUpperCase() });
      f++;
    }
  });
  return out;
}

const dist = (a: string, b: string) =>
  Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));

/** Keeps stable ids across positions so pieces slide instead of teleporting. */
function track(prev: TrackedPiece[], fen: string): TrackedPiece[] {
  const next = piecesFromFen(fen);
  const unused = new Set(prev);
  const result: (TrackedPiece | null)[] = next.map((n) => {
    const same = prev.find((p) => unused.has(p) && p.sq === n.sq && p.code === n.code);
    if (same) { unused.delete(same); return same; }
    return null;
  });
  const match = (n: { sq: string; code: string }, pred: (p: TrackedPiece) => boolean) => {
    let best: TrackedPiece | null = null;
    for (const p of unused) if (pred(p) && (!best || dist(p.sq, n.sq) < dist(best.sq, n.sq))) best = p;
    if (best) unused.delete(best);
    return best;
  };
  return next.map((n, i) => {
    if (result[i]) return result[i]!;
    const m = match(n, (p) => p.code === n.code) ?? match(n, (p) => p.code === n.code[0] + "P");
    return { id: m ? m.id : `p${idSeq++}`, sq: n.sq, code: n.code };
  });
}

export type BoardProps = {
  fen: string;
  orientation: Color;
  /** which color the user may move right now (null = view only) */
  movable: Color | "both" | null;
  lastMove?: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
};

export function Board({ fen, orientation, movable, lastMove, onMove }: BoardProps) {
  const settings = useSettings();
  const boardRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<TrackedPiece[]>(() => track([], fen));
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; from: string; x: number; y: number } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string; color: Color } | null>(null);
  const pressedSelected = useRef(false);

  useEffect(() => {
    setPieces((prev) => track(prev, fen));
    setSelected(null);
    setPromo(null);
  }, [fen]);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const turn = chess.turn();
  const canMoveColor = (c: Color) => movable === "both" ? c === turn : movable === c && c === turn;

  const targets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const m = new Map<string, boolean>();
    for (const mv of chess.moves({ square: selected as Square, verbose: true })) m.set(mv.to, !!mv.captured);
    return m;
  }, [chess, selected]);

  const checkSq = chess.inCheck() ? findKingSquare(chess, turn) : null;

  const toXY = (sq: string) => {
    const f = sq.charCodeAt(0) - 97;
    const r = Number(sq[1]) - 1;
    return orientation === "w" ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
  };
  const fromPoint = (clientX: number, clientY: number): string | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const f = orientation === "w" ? col : 7 - col;
    const r = orientation === "w" ? 7 - row : row;
    return `${FILES[f]}${r + 1}`;
  };

  const tryMove = (from: string, to: string) => {
    const legal = chess.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to);
    if (legal.length === 0) return false;
    if (legal.some((m) => m.promotion)) {
      setPromo({ from, to, color: chess.get(from as Square)!.color });
      return true;
    }
    onMove(from, to);
    setSelected(null);
    return true;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (promo || !movable) return;
    const sq = fromPoint(e.clientX, e.clientY);
    if (!sq) return;
    const piece = chess.get(sq as Square);
    if (selected && selected !== sq && targets.has(sq)) {
      tryMove(selected, sq);
      return;
    }
    if (piece && canMoveColor(piece.color)) {
      pressedSelected.current = selected === sq;
      setSelected(sq);
      const tp = pieces.find((p) => p.sq === sq);
      const rect = boardRef.current!.getBoundingClientRect();
      if (tp) {
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        setDrag({ id: tp.id, from: sq, x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      setSelected(null);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const rect = boardRef.current!.getBoundingClientRect();
    setDrag({ ...drag, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const sq = fromPoint(e.clientX, e.clientY);
    const from = drag.from;
    setDrag(null);
    if (sq && sq !== from) {
      if (!tryMove(from, sq)) setSelected(null);
    } else if (sq === from && pressedSelected.current) {
      setSelected(null);
    }
  };

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const f = orientation === "w" ? col : 7 - col;
      const r = orientation === "w" ? 7 - row : row;
      const sq = `${FILES[f]}${r + 1}`;
      const light = (f + r) % 2 === 1;
      const isTarget = settings.showLegal && targets.has(sq);
      squares.push(
        <div
          key={sq}
          className={cn(
            "relative",
            light ? "sq-light" : "sq-dark",
            lastMove && (lastMove.from === sq || lastMove.to === sq) && "sq-last",
            selected === sq && "sq-select",
            checkSq === sq && "sq-check",
            isTarget && (targets.get(sq) ? "sq-ring" : "sq-dot"),
          )}
          role="gridcell"
          aria-label={sq}
        >
          {settings.coordinates && col === 0 && (
            <span className={cn("absolute left-0.5 top-0 text-[9px] font-bold sm:text-[11px]", light ? "sq-coord-light" : "sq-coord-dark")}>{r + 1}</span>
          )}
          {settings.coordinates && row === 7 && (
            <span className={cn("absolute bottom-0 right-1 text-[9px] font-bold sm:text-[11px]", light ? "sq-coord-light" : "sq-coord-dark")}>{FILES[f]}</span>
          )}
        </div>,
      );
    }
  }

  return (
    <div
      data-board={settings.boardTheme}
      className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-lg shadow-board"
      ref={boardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      role="grid"
      aria-label="Chess board"
    >
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">{squares}</div>
      {pieces.map((p) => {
        const { col, row } = toXY(p.sq);
        const dragging = drag?.id === p.id;
        const style = dragging && boardRef.current
          ? { transform: `translate(${drag!.x - boardRef.current.clientWidth / 16}px, ${drag!.y - boardRef.current.clientHeight / 16}px)` }
          : { transform: `translate(${col * 100}%, ${row * 100}%)` };
        return (
          <div key={p.id} className={cn("piece", dragging ? "piece-drag" : settings.animations && "piece-anim")} style={style}>
            <img src={`/pieces/${p.code}.svg`} alt="" className="h-full w-full" draggable={false} />
          </div>
        );
      })}
      {promo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
          <div className="glass animate-pop-in rounded-2xl p-3 text-center">
            <p className="mb-2 font-display text-lg text-gold">Promote to</p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((t) => (
                <button
                  key={t}
                  className="h-16 w-16 rounded-xl bg-secondary transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`Promote to ${{ q: "queen", r: "rook", b: "bishop", n: "knight" }[t]}`}
                  onClick={() => { onMove(promo.from, promo.to, t); setPromo(null); setSelected(null); }}
                >
                  <img src={`/pieces/${promo.color}${t.toUpperCase()}.svg`} alt="" className="h-full w-full p-1" />
                </button>
              ))}
            </div>
            <button className="mt-2 text-sm text-muted-foreground" onClick={() => setPromo(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
