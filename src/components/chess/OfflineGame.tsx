import { Chess, type Color, type Move } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlipVertical2, RotateCcw, Undo2 } from "lucide-react";
import { Board } from "./Board";
import { MoveList, PlayerBar } from "./GameParts";
import { Button } from "@/components/ui/button";
import { capturedBy, detectEnd, materialDiff, resultText, type GameEnd } from "@/lib/chess/utils";
import { LEVELS, type Level, type EngineMove } from "@/lib/chess/engine";
import { playSound, soundForSan } from "@/lib/sound";

type Props = { mode: "computer" | "local"; level?: Level; playerColor?: Color; timeMs?: number | null };

export function OfflineGame({ mode, level = 2, playerColor = "w", timeMs = null }: Props) {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [history, setHistory] = useState<Move[]>([]);
  const [end, setEnd] = useState<GameEnd | { result: string; reason: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [orientation, setOrientation] = useState<Color>(mode === "computer" ? playerColor : "w");
  const [clocks, setClocks] = useState({ w: timeMs ?? 0, b: timeMs ?? 0 });
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);

  const sync = useCallback(() => {
    const c = chessRef.current;
    setFen(c.fen());
    setHistory(c.history({ verbose: true }));
    const e = detectEnd(c);
    setEnd(e);
    return e;
  }, []);

  const doMove = useCallback((m: { from: string; to: string; promotion?: string | undefined }) => {
    try {
      const played = chessRef.current.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
      const e = sync();
      playSound(e ? "end" : soundForSan(played.san));
      return true;
    } catch {
      return false;
    }
  }, [sync]);

  // engine worker
  useEffect(() => {
    if (mode !== "computer") return;
    const w = new Worker(new URL("../../lib/chess/engine.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    return () => { w.terminate(); workerRef.current = null; };
  }, [mode]);

  const turn = fen.split(" ")[1] as Color;
  useEffect(() => {
    if (mode !== "computer" || end || turn === playerColor || !workerRef.current) return;
    const w = workerRef.current;
    const id = ++reqId.current;
    setThinking(true);
    const started = Date.now();
    const onMsg = (e: MessageEvent<{ id: number; move: EngineMove | null }>) => {
      if (e.data.id !== id) return;
      const delay = Math.max(0, 450 - (Date.now() - started));
      setTimeout(() => {
        if (id !== reqId.current) return;
        setThinking(false);
        if (e.data.move) doMove(e.data.move);
      }, delay);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ id, fen, level });
    return () => w.removeEventListener("message", onMsg);
  }, [fen, mode, end, turn, playerColor, level, doMove]);

  // clocks for local timed games
  useEffect(() => {
    if (!timeMs || end || history.length === 0) return;
    const t = setInterval(() => {
      setClocks((c) => {
        const left = c[turn] - 100;
        if (left <= 0) {
          setEnd({ result: turn === "w" ? "0-1" : "1-0", reason: "timeout" });
          playSound("end");
        }
        return { ...c, [turn]: Math.max(0, left) };
      });
    }, 100);
    return () => clearInterval(t);
  }, [timeMs, end, turn, history.length]);

  const restart = () => {
    reqId.current++;
    chessRef.current = new Chess();
    setThinking(false);
    setClocks({ w: timeMs ?? 0, b: timeMs ?? 0 });
    sync();
    playSound("start");
  };

  const undo = () => {
    reqId.current++;
    setThinking(false);
    const c = chessRef.current;
    if (mode === "computer") {
      c.undo();
      if (c.turn() !== playerColor) c.undo();
    } else c.undo();
    sync();
  };

  const last = history[history.length - 1];
  const moves = useMemo(() => history.map((m) => m.san), [history]);
  const diff = materialDiff(fen);
  const lv = LEVELS.find((l) => l.level === level)!;
  const top: Color = orientation === "w" ? "b" : "w";
  const bottom: Color = orientation;
  const nameOf = (c: Color) =>
    mode === "computer" ? (c === playerColor ? "You" : `${lv.name} (Computer)`) : c === "w" ? "White" : "Black";

  const bar = (c: Color) => (
    <PlayerBar
      name={nameOf(c)}
      rating={mode === "computer" && c !== playerColor ? lv.rating : null}
      bot={mode === "computer" && c !== playerColor}
      color={c}
      captured={capturedBy(fen, c)}
      advantage={c === "w" ? diff : -diff}
      clockMs={timeMs ? clocks[c] : null}
      active={!end && turn === c}
    />
  );

  const status = end
    ? resultText(end.result, end.reason)
    : thinking
      ? "Computer is thinking…"
      : chessRef.current.inCheck()
        ? `${turn === "w" ? "White" : "Black"} is in check`
        : `${turn === "w" ? "White" : "Black"} to move`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-14rem))] space-y-2">
        {bar(top)}
        <Board
          fen={fen}
          orientation={orientation}
          movable={end ? null : mode === "local" ? "both" : playerColor}
          lastMove={last ? { from: last.from, to: last.to } : null}
          onMove={(from, to, promotion) => { if (!thinking) doMove({ from, to, promotion }); }}
        />
        {bar(bottom)}
      </div>
      <aside className="glass space-y-4 rounded-2xl p-4">
        <div aria-live="polite" className={end ? "font-display text-2xl text-gold" : "font-medium"}>{status}</div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={undo} disabled={history.length === 0}>
            <Undo2 /> Undo
          </Button>
          <Button variant="secondary" onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            <FlipVertical2 /> Flip
          </Button>
          <Button onClick={restart}>
            <RotateCcw /> Restart
          </Button>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Moves</h2>
          <MoveList moves={moves} />
        </div>
      </aside>
    </div>
  );
}
