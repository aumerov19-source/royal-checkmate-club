import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Globe, Settings, User, Users, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import hero from "@/assets/hero-king.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Royal Chess — Play chess online, vs computer or with friends" },
      { name: "description", content: "An elegant chess game. Play online with friends via room codes, challenge the computer, or pass and play." },
      { property: "og:title", content: "Royal Chess" },
      { property: "og:description", content: "Elegant online chess — play friends in real time or challenge the computer." },
    ],
  }),
  component: Home,
});

const CARDS = [
  { to: "/online", title: "Play Online", desc: "Invite a friend with a link or room code", icon: Globe, primary: true },
  { to: "/computer", title: "Play vs Computer", desc: "Four difficulty levels", icon: Bot, primary: true },
  { to: "/local", title: "Pass & Play", desc: "Two players, one device", icon: Swords },
  { to: "/friends", title: "Friends", desc: "Recent opponents & rematches", icon: Users },
  { to: "/profile", title: "Profile", desc: "Rating, stats and history", icon: User },
  { to: "/settings", title: "Settings", desc: "Board theme, sound, moves", icon: Settings },
] as const;

function Home() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl shadow-board">
        <img src={hero} alt="A gold chess king on a navy board" width={1280} height={896} className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 p-5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">The game of kings</p>
          <h1 className="mt-1 text-5xl font-bold leading-none text-gold-gradient sm:text-6xl">Royal Chess</h1>
        </div>
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CARDS.map((c, i) => (
          <Link
            key={c.to}
            to={c.to}
            style={{ animationDelay: `${i * 50}ms` }}
            className={
              "animate-pop-in group rounded-2xl p-4 transition hover:-translate-y-0.5 " +
              ("primary" in c && c.primary ? "col-span-2 bg-gold-gradient text-primary-foreground shadow-gold sm:col-span-1" : "glass hover:border-gold/50")
            }
          >
            <c.icon className={"h-7 w-7 " + ("primary" in c && c.primary ? "" : "text-gold")} />
            <div className="mt-3 font-display text-xl font-bold">{c.title}</div>
            <div className={"text-xs " + ("primary" in c && c.primary ? "opacity-80" : "text-muted-foreground")}>{c.desc}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
