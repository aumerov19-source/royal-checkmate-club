import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { joinGame } from "@/lib/online.functions";

export const Route = createFileRoute("/_authenticated/join/$code")({
  head: () => ({
    meta: [
      { title: "Join game — Royal Chess" },
      { name: "description", content: "You've been invited to a game of Royal Chess." },
      { property: "og:title", content: "You're invited to Royal Chess" },
      { property: "og:description", content: "Tap to join the game." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = Route.useParams();
  const join = useServerFn(joinGame);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    join({ data: { code } })
      .then((r) => ("error" in r ? setError(r.error) : navigate({ to: "/game/$id", params: { id: r.id }, replace: true })))
      .catch(() => setError("That invite link isn't valid"));
  }, [code, join, navigate]);
  return (
    <AppShell>
      <div className="glass mx-auto max-w-sm rounded-2xl p-6 text-center">
        {error ? (
          <>
            <p className="font-display text-2xl">{error}</p>
            <Link to="/online" className="mt-4 inline-block text-gold">Back to Play Online</Link>
          </>
        ) : <p className="animate-pulse-dot">Joining game {code}…</p>}
      </div>
    </AppShell>
  );
}
