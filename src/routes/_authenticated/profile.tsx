import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PlayerAvatar } from "@/components/chess/GameParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Royal Chess" },
      { name: "description", content: "Your Royal Chess rating, stats and name." },
      { property: "og:title", content: "Profile — Royal Chess" },
      { property: "og:description", content: "Your rating and stats." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).single();
      return { ...data!, email: u.user!.email };
    },
  });
  const [name, setName] = useState("");
  useEffect(() => { if (profile.data) setName(profile.data.display_name); }, [profile.data]);
  const p = profile.data;

  const save = async () => {
    if (!p) return;
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", p.id);
    if (error) toast.error("Couldn't save"); else { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["my-profile"] }); }
  };
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (!p) return <AppShell><p className="animate-pulse-dot text-center text-muted-foreground">Loading…</p></AppShell>;
  return (
    <AppShell>
      <div className="flex items-center gap-4">
        <PlayerAvatar name={p.display_name} size={72} />
        <div>
          <h1 className="text-3xl font-bold">{p.display_name}</h1>
          <p className="text-sm text-muted-foreground">{p.email}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2 text-center">
        {[["Rating", p.rating], ["Wins", p.wins], ["Losses", p.losses], ["Draws", p.draws]].map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-3">
            <div className="font-display text-2xl font-bold text-gold">{v}</div>
            <div className="text-xs text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>
      <div className="glass mt-6 rounded-2xl p-4">
        <label htmlFor="dn" className="text-sm font-medium">Display name</label>
        <div className="mt-2 flex gap-2">
          <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          <Button onClick={save}>Save</Button>
        </div>
      </div>
      <Button variant="secondary" className="mt-6 w-full" onClick={signOut}>Sign out</Button>
    </AppShell>
  );
}
