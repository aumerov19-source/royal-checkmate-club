import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyOnlineMove, checkTimeout, makeRoomCode } from "./chess/online-logic";

const sq = z.string().regex(/^[a-h][1-8]$/);

export const createGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ color: z.enum(["w", "b", "random"]), minutes: z.number().int().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const color = data.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : data.color;
    const ms = data.minutes * 60000;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeRoomCode();
      const { data: row, error } = await supabaseAdmin.from("games").insert({
        code, created_by: context.userId,
        white_id: color === "w" ? context.userId : null,
        black_id: color === "b" ? context.userId : null,
        time_control_ms: ms, white_ms: ms, black_ms: ms,
      }).select("id, code").single();
      if (!error && row) return row;
      if (error && !String(error.message).includes("duplicate")) throw new Error("Could not create game");
    }
    throw new Error("Could not create game");
  });

export const joinGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: g } = await supabaseAdmin.from("games").select("*").eq("code", data.code).maybeSingle();
    if (!g) return { error: "No game found with that code" as const };
    const uid = context.userId;
    if (g.white_id === uid || g.black_id === uid) return { id: g.id };
    if (g.status !== "waiting") return { error: "This game already has two players" as const };
    const seat = g.white_id ? { black_id: uid } : { white_id: uid };
    const { data: upd } = await supabaseAdmin.from("games")
      .update({ ...seat, status: "active", turn_started_at: new Date().toISOString(), version: g.version + 1, updated_at: new Date().toISOString() })
      .eq("id", g.id).eq("version", g.version).eq("status", "waiting")
      .select("id").maybeSingle();
    if (!upd) return { error: "Someone else just joined this game" as const };
    return { id: upd.id };
  });

export const makeMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid(), from: sq, to: sq, promotion: z.enum(["q", "r", "b", "n"]).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    // read through RLS: only players can see the game
    const { data: g } = await context.supabase.from("games").select("*").eq("id", data.gameId).maybeSingle();
    if (!g) return { error: "Game not found" };
    const res = applyOnlineMove(g, context.userId, data, Date.now());
    if (!res.ok) return { error: res.error };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: upd } = await supabaseAdmin.from("games").update(res.update)
      .eq("id", g.id).eq("version", g.version).select("*").maybeSingle();
    if (!upd) return { error: "Position changed — syncing" };
    if (upd.status === "finished") {
      const { applyRatings } = await import("./online.server");
      await applyRatings(supabaseAdmin, upd);
    }
    return { ok: true as const };
  });

export const resignGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("games").select("*").eq("id", data.gameId).maybeSingle();
    if (!g) return { error: "Game not found" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (g.status === "waiting" && g.created_by === context.userId) {
      await supabaseAdmin.from("games").update({ status: "finished", result_reason: "cancelled", version: g.version + 1 }).eq("id", g.id);
      return { ok: true as const };
    }
    if (g.status !== "active") return { error: "Game is not active" };
    const color = g.white_id === context.userId ? "w" : g.black_id === context.userId ? "b" : null;
    if (!color) return { error: "Not a player" };
    const { data: upd } = await supabaseAdmin.from("games").update({
      status: "finished", result: color === "w" ? "0-1" : "1-0", result_reason: "resignation",
      turn_started_at: null, version: g.version + 1, updated_at: new Date().toISOString(),
    }).eq("id", g.id).eq("version", g.version).select("*").maybeSingle();
    if (!upd) return { error: "Position changed — try again" };
    const { applyRatings } = await import("./online.server");
    await applyRatings(supabaseAdmin, upd);
    return { ok: true as const };
  });

export const claimTimeout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ gameId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: g } = await context.supabase.from("games").select("*").eq("id", data.gameId).maybeSingle();
    if (!g) return { error: "Game not found" };
    const upd = checkTimeout(g, Date.now());
    if (!upd) return { error: "Time remains" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("games").update(upd).eq("id", g.id).eq("version", g.version).select("*").maybeSingle();
    if (row) {
      const { applyRatings } = await import("./online.server");
      await applyRatings(supabaseAdmin, row);
    }
    return { ok: true as const };
  });
