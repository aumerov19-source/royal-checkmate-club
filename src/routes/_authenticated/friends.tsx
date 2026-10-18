import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/chess/GameParts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — Royal Chess" },
      { name: "description", content: "People you've played on Royal Chess." },
      { property: "og:title", content: "Friends — Royal Chess" },
      { property: "og:description", content: "Your recent opponents." },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const q = useQuery({
    queryKey: ["opponents"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const me = u.user!.id;
      const { data: games } = await supabase.from("games").select("white_id, black_id, updated_at")
        .not("white_id", "is", null).not("black_id", "is", null).order("updated_at", { ascending: false }).limit(50);
      const counts = new Map<string, number>();
      for (const g of games ?? []) {
        const opp = g.white_id === me ? g.black_id : g.white_id;
        if (opp) counts.set(opp, (counts.get(opp) ?? 0) + 1);
      }
      if (counts.size === 0) return [];
      const { data: ps } = await supabase.from("profiles").select("id, display_name, rating").in("id", [...counts.keys()]);
      return (ps ?? []).map((p) => ({ ...p, games: counts.get(p.id) ?? 0 })).sort((a, b) => b.games - a.games);
    },
  });
  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-gold-gradient">Friends</h1>
      <p className="mt-1 text-sm text-muted-foreground">People you've played online. Send a new invite link to play again.</p>
      <div className="mt-6 space-y-2">
        {q.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center">
            <p>No opponents yet.</p>
            <Button asChild className="mt-4"><Link to="/online">Invite a friend</Link></Button>
          </div>
        )}
        {q.data?.map((p) => (
          <div key={p.id} className="glass flex items-center gap-3 rounded-xl p-3">
            <PlayerAvatar name={p.display_name} />
            <div className="flex-1">
              <div className="font-semibold">{p.display_name}</div>
              <div className="text-xs text-muted-foreground">{p.rating} · {p.games} game{p.games === 1 ? "" : "s"}</div>
            </div>
            <Button size="sm" asChild><Link to="/online">Rematch</Link></Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
