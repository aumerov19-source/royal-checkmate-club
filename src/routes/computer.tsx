import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Color } from "chess.js";
import { AppShell } from "@/components/AppShell";
import { OfflineGame } from "@/components/chess/OfflineGame";
import { Button } from "@/components/ui/button";
import { LEVELS, type Level } from "@/lib/chess/engine";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sound";

export const Route = createFileRoute("/computer")({
  head: () => ({
    meta: [
      { title: "Play vs Computer — Royal Chess" },
      { name: "description", content: "Challenge the Royal Chess computer at four difficulty levels, with undo and restart." },
      { property: "og:title", content: "Play vs Computer — Royal Chess" },
      { property: "og:description", content: "Four difficulty levels from Squire to Monarch." },
    ],
  }),
  component: ComputerPage,
});

function ComputerPage() {
  const [level, setLevel] = useState<Level>(2);
  const [color, setColor] = useState<Color | "random">("w");
  const [game, setGame] = useState<{ level: Level; color: Color; key: number } | null>(null);

  if (game) {
    return (
      <AppShell wide>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold">vs {LEVELS[game.level - 1].name}</h1>
          <Button variant="ghost" size="sm" onClick={() => setGame(null)}>New setup</Button>
        </div>
        <OfflineGame key={game.key} mode="computer" level={game.level} playerColor={game.color} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-gold-gradient">Play vs Computer</h1>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Difficulty</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => setLevel(l.level)}
            aria-pressed={level === l.level}
            className={cn("glass rounded-2xl p-4 text-left transition", level === l.level && "border-gold bg-gold-soft")}
          >
            <div className="font-display text-xl font-bold">{l.name}</div>
            <div className="text-xs text-muted-foreground">{l.desc} · ~{l.rating}</div>
          </button>
        ))}
      </div>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Play as</h2>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {(["w", "random", "b"] as const).map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-pressed={color === c}
            className={cn("glass flex flex-col items-center rounded-2xl p-3 transition", color === c && "border-gold bg-gold-soft")}>
            {c === "random" ? <span className="flex h-10 items-center font-display text-2xl text-gold">?</span>
              : <img src={`/pieces/${c}K.svg`} alt="" className="h-10 w-10" />}
            <span className="text-sm">{c === "w" ? "White" : c === "b" ? "Black" : "Random"}</span>
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-8 w-full" onClick={() => {
        playSound("start");
        setGame({ level, color: color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color, key: Date.now() });
      }}>Start game</Button>
    </AppShell>
  );
}
