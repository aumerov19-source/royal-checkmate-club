import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OfflineGame } from "@/components/chess/OfflineGame";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/local")({
  head: () => ({
    meta: [
      { title: "Pass & Play — Royal Chess" },
      { name: "description", content: "Play chess with a friend on the same device, with optional clocks." },
      { property: "og:title", content: "Pass & Play — Royal Chess" },
      { property: "og:description", content: "Two players, one device." },
    ],
  }),
  component: LocalPage,
});

const TIMES = [null, 3, 5, 10] as const;

function LocalPage() {
  const [minutes, setMinutes] = useState<number | null>(null);
  return (
    <AppShell wide>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Pass & Play</h1>
        <div className="flex gap-1" role="group" aria-label="Clock">
          {TIMES.map((t) => (
            <button key={String(t)} onClick={() => setMinutes(t)} aria-pressed={minutes === t}
              className={cn("rounded-lg px-3 py-1 text-sm", minutes === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
              {t ? `${t} min` : "No clock"}
            </button>
          ))}
        </div>
      </div>
      <OfflineGame key={String(minutes)} mode="local" timeMs={minutes ? minutes * 60000 : null} />
    </AppShell>
  );
}
