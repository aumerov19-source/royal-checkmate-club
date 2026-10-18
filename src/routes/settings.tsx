import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { BOARD_THEMES, updateSettings, useSettings, type Settings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sound";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Royal Chess" },
      { name: "description", content: "Choose your board theme, sounds and move hints." },
      { property: "og:title", content: "Settings — Royal Chess" },
      { property: "og:description", content: "Customize your Royal Chess board." },
    ],
  }),
  component: SettingsPage,
});

const TOGGLES: { key: keyof Settings; label: string }[] = [
  { key: "sound", label: "Sound effects" },
  { key: "showLegal", label: "Show legal moves" },
  { key: "animations", label: "Piece animations" },
  { key: "coordinates", label: "Board coordinates" },
];

function SettingsPage() {
  const s = useSettings();
  return (
    <AppShell>
      <h1 className="text-4xl font-bold text-gold-gradient">Settings</h1>
      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground font-sans">Board theme</h2>
      <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {BOARD_THEMES.map((t) => (
          <button key={t.id} data-board={t.id} onClick={() => updateSettings({ boardTheme: t.id })} aria-pressed={s.boardTheme === t.id}
            className={cn("glass rounded-xl p-2 transition", s.boardTheme === t.id && "border-gold bg-gold-soft")}>
            <div className="grid aspect-square grid-cols-4 overflow-hidden rounded-md">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={(Math.floor(i / 4) + i) % 2 === 0 ? "sq-light" : "sq-dark"} />
              ))}
            </div>
            <div className="mt-1 text-xs">{t.name}</div>
          </button>
        ))}
      </div>
      <div className="glass mt-6 divide-y divide-border rounded-2xl">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex items-center justify-between p-4">
            <span>{t.label}</span>
            <Switch checked={s[t.key] as boolean} onCheckedChange={(v) => { updateSettings({ [t.key]: v }); if (t.key === "sound" && v) playSound("move"); }} />
          </label>
        ))}
      </div>
    </AppShell>
  );
}
