import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGame, joinGame } from "@/lib/online.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { resultText } from "@/lib/chess/utils";

export const Route = createFileRoute("/_authenticated/online")({
  head: () => ({
    meta: [
      { title: "Play Online — Royal Chess" },
      { name: "description", content: "Create a chess room and share the invite link or code, or join a friend's game." },
      { property: "og:title", content: "Play Online — Royal Chess" },
      { property: "og:description", content: "Real-time chess with friends via invite links." },
    ],
  }),
  component: OnlinePage,
});

const MINUTES = [3, 5, 10, 15];

function OnlinePage() {
  const navigate = useNavigate();
  const create = useServerFn(createGame);
  const join = useServerFn(joinGame);
  const [minutes, setMinutes] = useState(10);
  const [color, setColor] = useState<"w" | "b" | "random">("random");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const games = useQuery({
    queryKey: ["my-games"],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("id, code, status, result, result_reason, updated_at")
        .neq("result_reason", "cancelled").order("updated_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const onCreate = async () => {
    setBusy(true);
    try {
      const g = await create({ data: { color, minutes } });
      navigate({ to: "/game/$id", params: { id: g.id } });
    } catch { toast.error("Couldn't create a game. Please try again."); }
    finally { setBusy(false); }
  };
  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await join({ data: { code } });
      if ("error" in r) toast.error(r.error);
      else navigate({ to: "/game/$id", params: { id: r.id } });
    } catch { toast.error("Enter a valid 6-character code"); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-gold-gradient">Play Online</h1>
      <section className="glass mt-6 rounded-2xl p-5">
        <h2 className="text-2xl font-bold">Create a game</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Time control">
          {MINUTES.map((m) => (
            <button key={m} onClick={() => setMinutes(m)} aria-pressed={minutes === m}
              className={cn("rounded-lg px-3 py-1.5 text-sm", minutes === m ? "bg-primary text-primary-foreground" : "bg-secondary")}>{m} min</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2" role="group" aria-label="Color">
          {(["w", "random", "b"] as const).map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-pressed={color === c}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", color === c ? "bg-primary text-primary-foreground" : "bg-secondary")}>
              {c !== "random" && <img src={`/pieces/${c}K.svg`} alt="" className="h-5 w-5" />}
              {c === "w" ? "White" : c === "b" ? "Black" : "Random"}
            </button>
          ))}
        </div>
        <Button className="mt-4 w-full" size="lg" onClick={onCreate} disabled={busy}>Create & get invite link</Button>
      </section>
      <section className="glass mt-4 rounded-2xl p-5">
        <h2 className="text-2xl font-bold">Join with a code</h2>
        <form onSubmit={onJoin} className="mt-3 flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123"
            className="font-mono text-lg tracking-[0.3em] uppercase" aria-label="Room code" />
          <Button type="submit" disabled={busy || code.length !== 6}>Join</Button>
        </form>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Your games</h2>
        <div className="mt-2 space-y-2">
          {games.data?.length === 0 && <p className="text-sm text-muted-foreground">No games yet.</p>}
          {games.data?.map((g) => (
            <Link key={g.id} to="/game/$id" params={{ id: g.id }} className="glass flex items-center justify-between rounded-xl p-3 text-sm">
              <span className="font-mono tracking-widest">{g.code}</span>
              <span className={g.status === "active" ? "text-gold" : "text-muted-foreground"}>
                {g.status === "waiting" ? "Waiting for opponent" : g.status === "active" ? "In progress" : resultText(g.result, g.result_reason)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
