import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, type Color } from "chess.js";
import { Copy, Flag, Share2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Board } from "@/components/chess/Board";
import { MoveList, PlayerBar } from "@/components/chess/GameParts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { claimTimeout, makeMove, resignGame } from "@/lib/online.functions";
import { replay } from "@/lib/chess/online-logic";
import { capturedBy, materialDiff, resultText } from "@/lib/chess/utils";
import { playSound, soundForSan } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/game/$id")({
  head: () => ({
    meta: [
      { title: "Online game — Royal Chess" },
      { name: "description", content: "A live Royal Chess game." },
      { property: "og:title", content: "Online game — Royal Chess" },
      { property: "og:description", content: "Live chess in real time." },
    ],
  }),
  component: GamePage,
});

type Game = Tables<"games">;
type Profile = Tables<"profiles">;

function GamePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(true);
  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const move = useServerFn(makeMove);
  const resign = useServerFn(resignGame);
  const timeout = useServerFn(claimTimeout);
  const lastMoveCount = useRef<number | null>(null);
  const claiming = useRef(false);

  const applyRow = useCallback((row: Game) => {
    setGame((prev) => (prev && prev.version > row.version ? prev : row));
    setOptimisticFen(null);
  }, []);

  const refetch = useCallback(async () => {
    const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
    if (!data) setNotFound(true);
    else applyRow(data);
  }, [id, applyRow]);

  // live updates + presence
  useEffect(() => {
    if (!user) return;
    void refetch();
    const ch = supabase.channel(`game:${id}`, { config: { presence: { key: user.id } } });
    ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, (p) => applyRow(p.new as Game))
      .on("presence", { event: "sync" }, () => setOnlineIds(new Set(Object.keys(ch.presenceState()))))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          void ch.track({ at: Date.now() });
          void refetch(); // catch up on anything missed while disconnected
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
        }
      });
    const onFocus = () => { if (document.visibilityState === "visible") void refetch(); };
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(ch);
    };
  }, [id, user, refetch, applyRow]);

  // load player profiles
  const playerKey = `${game?.white_id}-${game?.black_id}`;
  useEffect(() => {
    const ids = [game?.white_id, game?.black_id].filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase.from("profiles").select("*").in("id", ids).then(({ data }) => {
      if (data) setProfiles(Object.fromEntries(data.map((p) => [p.id, p])));
    });
  }, [playerKey, game?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // sounds on new moves
  const moves = (game?.moves as string[] | undefined) ?? [];
  useEffect(() => {
    if (!game) return;
    if (lastMoveCount.current !== null && moves.length > lastMoveCount.current) {
      playSound(game.status === "finished" ? "end" : soundForSan(moves[moves.length - 1]!));
    } else if (lastMoveCount.current !== null && game.status === "finished") playSound("end");
    lastMoveCount.current = moves.length;
  }, [moves.length, game?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // clock tick
  useEffect(() => {
    if (game?.status !== "active") return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [game?.status]);

  if (notFound) {
    return <AppShell><p className="text-center">Game not found. <Link to="/online" className="text-gold">Back</Link></p></AppShell>;
  }
  if (!game || !user) return <AppShell><p className="animate-pulse-dot text-center text-muted-foreground">Loading game…</p></AppShell>;

  const myColor: Color | null = game.white_id === user.id ? "w" : game.black_id === user.id ? "b" : null;
  const orientation: Color = myColor ?? "w";
  const fen = optimisticFen ?? game.fen;
  const turn = game.fen.split(" ")[1] as Color;
  const elapsed = game.status === "active" && game.turn_started_at ? Math.max(0, now - new Date(game.turn_started_at).getTime()) : 0;
  const clock = (c: Color) => (c === "w" ? game.white_ms : game.black_ms) - (turn === c ? elapsed : 0);

  if (game.status === "active" && clock(turn) <= 0 && !claiming.current) {
    claiming.current = true;
    void timeout({ data: { gameId: id } }).finally(() => { claiming.current = false; void refetch(); });
  }

  const onMove = async (from: string, to: string, promotion?: string) => {
    // optimistic display; server is the source of truth
    try {
      const c = replay(moves);
      c.move({ from, to, promotion: promotion ?? "q" });
      setOptimisticFen(c.fen());
    } catch { return; }
    const r = await move({ data: { gameId: id, from, to, promotion: promotion as "q" | undefined } }).catch(() => ({ error: "Connection problem — move not sent" }));
    if ("error" in r && r.error) {
      toast.error(r.error);
      setOptimisticFen(null);
      void refetch();
    }
  };

  const nameFor = (c: Color) => {
    const pid = c === "w" ? game.white_id : game.black_id;
    if (!pid) return "Waiting…";
    return (profiles[pid]?.display_name ?? "Player") + (pid === user.id ? " (you)" : "");
  };
  const diff = materialDiff(fen);
  const bar = (c: Color) => {
    const pid = c === "w" ? game.white_id : game.black_id;
    return (
      <PlayerBar name={nameFor(c)} rating={pid ? profiles[pid]?.rating : null} color={c}
        captured={capturedBy(fen, c)} advantage={c === "w" ? diff : -diff}
        clockMs={clock(c)} active={game.status === "active" && turn === c}
        online={pid ? onlineIds.has(pid) : null} />
    );
  };

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${game.code}` : "";
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Play Royal Chess with me", url: inviteUrl }); return; } catch { /* fallthrough */ } }
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  };
  const lastSan = moves[moves.length - 1];
  const lastMove = (() => {
    if (!lastSan) return null;
    const c = replay(moves.slice(0, -1));
    const m = c.move(lastSan);
    return { from: m.from, to: m.to };
  })();
  const inCheck = new Chess(fen).inCheck();
  const oppId = myColor === "w" ? game.black_id : game.white_id;

  const status =
    game.status === "waiting" ? "Waiting for your opponent to join"
    : game.status === "finished" ? (game.result_reason === "cancelled" ? "Game cancelled" : resultText(game.result, game.result_reason))
    : turn === myColor ? (inCheck ? "Your move — you're in check!" : "Your move")
    : `Waiting for ${nameFor(turn)}`;

  return (
    <AppShell wide>
      {!connected && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/20 p-3 text-sm" role="status">
          <WifiOff className="h-4 w-4" /> Connection lost — reconnecting. Your game is saved.
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-14rem))] space-y-2">
          {bar(orientation === "w" ? "b" : "w")}
          <Board fen={fen} orientation={orientation}
            movable={game.status === "active" && myColor && turn === myColor && !optimisticFen ? myColor : null}
            lastMove={lastMove} onMove={onMove} />
          {bar(orientation)}
        </div>
        <aside className="glass space-y-4 rounded-2xl p-4">
          <div aria-live="polite" className={game.status === "finished" ? "font-display text-2xl text-gold" : "font-medium"}>{status}</div>
          {game.status === "active" && oppId && !onlineIds.has(oppId) && (
            <p className="text-xs text-muted-foreground">Your opponent is offline. Their clock keeps running while it's their turn.</p>
          )}
          {game.status === "waiting" && (
            <div className="space-y-3">
              <div className="rounded-xl bg-secondary p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Room code</div>
                <div className="font-mono text-3xl font-bold tracking-[0.3em] text-gold">{game.code}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={share}><Share2 /> Share link</Button>
                <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(game.code); toast.success("Code copied"); }}><Copy /> Copy code</Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => resign({ data: { gameId: id } })}>Cancel game</Button>
            </div>
          )}
          {game.status === "active" && myColor && (
            <Button variant="secondary" className="w-full" onClick={() => { if (confirm("Resign this game?")) void resign({ data: { gameId: id } }); }}>
              <Flag /> Resign
            </Button>
          )}
          {game.status === "finished" && <Button asChild className="w-full"><Link to="/online">New online game</Link></Button>}
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Moves</h2>
            <MoveList moves={moves} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
