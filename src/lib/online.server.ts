import { eloUpdate } from "./chess/online-logic";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Applies rating and stat changes once a rated game has finished. */
export async function applyRatings(admin: Admin, g: { white_id: string | null; black_id: string | null; result: string | null }) {
  if (!g.white_id || !g.black_id || !g.result) return;
  const { data: ps } = await admin.from("profiles").select("*").in("id", [g.white_id, g.black_id]);
  const w = ps?.find((p) => p.id === g.white_id);
  const b = ps?.find((p) => p.id === g.black_id);
  if (!w || !b) return;
  const score = g.result === "1-0" ? 1 : g.result === "0-1" ? 0 : 0.5;
  const [rw, rb] = eloUpdate(w.rating, b.rating, score);
  await admin.from("profiles").update({
    rating: rw, games_played: w.games_played + 1,
    wins: w.wins + (score === 1 ? 1 : 0), losses: w.losses + (score === 0 ? 1 : 0), draws: w.draws + (score === 0.5 ? 1 : 0),
  }).eq("id", w.id);
  await admin.from("profiles").update({
    rating: rb, games_played: b.games_played + 1,
    wins: b.wins + (score === 0 ? 1 : 0), losses: b.losses + (score === 1 ? 1 : 0), draws: b.draws + (score === 0.5 ? 1 : 0),
  }).eq("id", b.id);
}
