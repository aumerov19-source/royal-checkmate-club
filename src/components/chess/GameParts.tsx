import type { Color, PieceSymbol } from "chess.js";
import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/chess/utils";

export function PlayerAvatar({ name, bot, size = 40 }: { name: string; bot?: boolean | undefined; size?: number }) {
  const initials = name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gold-gradient font-display font-bold text-primary-foreground shadow-gold"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {bot ? <Bot style={{ width: size * 0.55, height: size * 0.55 }} /> : initials}
    </div>
  );
}

export function PlayerBar({
  name, rating, color, captured, advantage, clockMs, active, online, bot,
}: {
  name: string; rating?: number | null | undefined; color: Color; captured: PieceSymbol[]; advantage: number;
  clockMs?: number | null; active: boolean; online?: boolean | null; bot?: boolean | undefined;
}) {
  const opp = color === "w" ? "b" : "w";
  return (
    <div className={cn("flex items-center gap-3 rounded-xl px-2 py-1.5 transition", active && "bg-gold-soft")}>
      <div className="relative">
        <PlayerAvatar name={name} bot={bot} size={36} />
        {online != null && (
          <span
            className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", online ? "bg-success" : "bg-muted-foreground")}
            aria-label={online ? "online" : "offline"}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold">{name}</span>
          {rating != null && <span className="text-xs text-muted-foreground">({rating})</span>}
          {online === false && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">offline</span>}
        </div>
        <div className="flex h-4 items-center">
          {captured.map((t, i) => (
            <img key={i} src={`/pieces/${opp}${t.toUpperCase()}.svg`} alt={t} className="-mr-1.5 h-4 w-4" />
          ))}
          {advantage > 0 && <span className="ml-2.5 text-xs text-muted-foreground">+{advantage}</span>}
        </div>
      </div>
      {clockMs != null && (
        <div
          className={cn(
            "min-w-[4.5rem] rounded-lg px-2.5 py-1 text-right font-mono text-lg font-semibold tabular-nums",
            active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            active && clockMs < 20000 && "bg-destructive text-destructive-foreground",
          )}
          aria-label={`${name} clock`}
        >
          {formatClock(clockMs)}
        </div>
      )}
    </div>
  );
}

export function MoveList({ moves }: { moves: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight; }
  }, [moves.length]);
  const pairs: [string, string | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i]!, moves[i + 1]]);
  return (
    <div ref={ref} className="flex gap-x-3 gap-y-1 overflow-x-auto whitespace-nowrap py-1 text-sm lg:max-h-72 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" aria-label="Move history">
      {pairs.length === 0 && <span className="text-muted-foreground">No moves yet</span>}
      {pairs.map(([w, b], i) => (
        <div key={i} className="flex shrink-0 gap-2 lg:grid lg:grid-cols-[2rem_1fr_1fr]">
          <span className="text-muted-foreground">{i + 1}.</span>
          <span className={cn("font-medium", i * 2 === moves.length - 1 && "text-gold")}>{w}</span>
          <span className={cn("font-medium", i * 2 + 1 === moves.length - 1 && "text-gold")}>{b ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
